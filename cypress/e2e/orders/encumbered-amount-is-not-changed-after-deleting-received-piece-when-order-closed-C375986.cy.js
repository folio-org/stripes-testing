import {
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Receivings } from '../../support/fragments/receiving';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    user: {},
    invoice: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;

    Organizations.createOrganizationViaApi(testData.organization).then((orgResp) => {
      testData.invoice.accountingCode = orgResp.erpCode;

      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          cy.getBookMaterialType().then((mtypeResp) => {
            testData.order = {
              ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              reEncumber: true,
            };
            testData.orderLine = BasicOrderLine.getDefaultOrderLine({
              checkinItems: true,
              createInventory: 'Instance, Holding, Item',
              specialLocationId: locationResp.id,
              specialMaterialTypeId: mtypeResp.id,
              listUnitPrice: 90,
              fundDistribution: [
                { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
              ],
            });

            Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
              (order) => {
                testData.order = order;

                Orders.updateOrderViaApi({
                  ...testData.order,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
                OrderLines.getOrderLineViaApi({
                  query: `poLineNumber=="*${order.poNumber}*"`,
                }).then((orderLines) => {
                  testData.orderLine = orderLines[0];

                  Receiving.addPieceViaApi({
                    searchParams: { createItem: 'true' },
                    poLineId: orderLines[0].id,
                    poLineNumber: orderLines[0].poLineNumber,
                    format: orderLines[0].orderFormat,
                    holdingId: orderLines[0].locations[0].holdingId,
                  })
                    .then((pieceResponse) => {
                      testData.piece = pieceResponse;

                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: testData.organization.id,
                        fiscalYearId: testData.fiscalYear.id,
                        poLineId: testData.orderLine.id,
                        fundDistributions: testData.orderLine.fundDistribution,
                        accountingCode: testData.organization.erpCode,
                        subTotal: 25,
                        releaseEncumbrance: true,
                      }).then((invoice) => {
                        testData.invoice = invoice;

                        Invoices.changeInvoiceStatusViaApi({
                          invoice: testData.invoice,
                          status: INVOICE_STATUSES.APPROVED,
                        });
                        Orders.updateOrderViaApi({
                          ...testData.order,
                          workflowStatus: ORDER_STATUSES.CLOSED,
                        });
                        Invoices.changeInvoiceStatusViaApi({
                          invoice: testData.invoice,
                          status: INVOICE_STATUSES.PAID,
                        });
                      });
                    })
                    .then(() => {
                      Receiving.receivePieceViaApi({
                        poLineId: testData.orderLine.id,
                        pieces: [
                          {
                            id: testData.piece.body.id,
                          },
                        ],
                      });
                    });
                });
              },
            );
          });
        },
      );
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375986 Encumbered amount is not changed after deleting received piece when related paid invoice exists and order is closed (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C375986'] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.CLOSED },
          { key: 'Total encumbered', value: '$0.00' },
        ],
      });
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Click "Actions" button, Select "Receive" option
      OrderLines.openReceiving();

      // Click <Title name from PO line> link
      const ReceivingDetails = Receivings.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
        expected: [],
        received: [{ barcode: testData.barcode, format: 'Physical' }],
      });

      // Click on the record in "Received" accordion on "<Title name>" pane
      const EditPieceModal = ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.checkFieldsConditions([
        { label: 'Piece format', conditions: { required: true, value: 'Physical' } },
        { label: 'Create item', conditions: { value: 'Connected' } },
      ]);

      // Click "Delete" button
      Receiving.openDropDownInEditPieceModal();
      const DeletePieceModal = EditPieceModal.clickDeleteButton();

      // Click "Delete item" button
      DeletePieceModal.clickDeleteItemButton();
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
        expected: [],
        received: [],
      });

      // Click "POL number" link in "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$90.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$25.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
