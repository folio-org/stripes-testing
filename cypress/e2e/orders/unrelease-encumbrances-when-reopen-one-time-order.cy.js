import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { NewOrder, BasicOrderLine, Orders } from '../../support/fragments/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.CLOSED,
            closeReason: { reason: 'Cancelled', note: '' },
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersReopenPurchaseOrders.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C354279 Unrelease encumbrances when reopen one-time order without related invoices and receiving (thunderjet) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.thunderjet] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);

      // Click "Actions" button, Select "Reopen" option
      OrderDetails.reOpenOrder({
        orderNumber: testData.order.poNumber,
      });

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [
          { key: 'Payment status', value: 'Awaiting Payment' },
          { key: 'Receipt status', value: 'Awaiting Receipt' },
        ],
      });

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$98.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
        ],
      });
    },
  );
});
