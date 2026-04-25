import { ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }), reEncumber: true },
    rollover: {},
    invoice: {},
    user: {},
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      ledger: { restrictEncumbrance: true, restrictExpenditures: true },
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.ledger = ledger;
    testData.fund = fund;
    testData.budget = budget;

    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      testData.orderLine = BasicOrderLine.getDefaultOrderLine({
        listUnitPrice: 100,
        fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
      });

      Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
        testData.order = order;

        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
          OrderLines.getOrderLineViaApi({
            query: `poLineNumber=="*${testData.order.poNumber}*"`,
          }).then((orderLines) => {
            testData.orderLine = orderLines[0];
            cy.wait(3000).then(() => {
              Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
                Receiving.receivePieceViaApi({
                  poLineId: testData.orderLine.id,
                  pieces: [
                    {
                      id: pieces[0].id,
                    },
                  ],
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
      id: testData.budget.id,
      fundId: testData.fund.id,
      ledgerId: testData.ledger.id,
      fiscalYearId: testData.fiscalYear.id,
    });
  });

  it(
    'C423548 Check possible actions for piece in "Received" status when edit piece (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C423548'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.varifyExpectedListIsEmpty();
      Receiving.selectRecordInReceivedList();
      Receiving.unreceiveInEditPieceModal();
      Receiving.varifyReceivedListIsEmpty();
    },
  );
});
