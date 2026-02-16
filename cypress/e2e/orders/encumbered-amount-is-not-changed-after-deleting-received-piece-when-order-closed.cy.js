import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Invoices, NewInvoice } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  CheckIn,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    ledger: {},
    fund: {},
    budget: {},
    order: {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
      reEncumber: true,
      approved: true,
    },
    orderLine: {},
    user: {},
    invoice: { ...NewInvoice.defaultUiInvoice },
  };

  before('Create test data', () => {
    cy.getAdminToken();
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;
    Organizations.createOrganizationViaApi(organization).then((orgResp) => {
      testData.invoice.accountingCode = organization.erpCode;

      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 90.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 90.0,
                },
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
                    value: 100,
                  },
                ],
                locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypeResp.id,
                  materialSupplier: orgResp,
                  volumes: [],
                },
              };

              Orders.createOrderViaApi(testData.order).then((orderResp) => {
                testData.order.id = orderResp.id;
                testData.orderNumber = orderResp.poNumber;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine)
                  .then((orderLineResp) => {
                    testData.orderLine = orderLineResp;

                    Orders.updateOrderViaApi({ ...orderResp, workflowStatus: ORDER_STATUSES.OPEN });

                    Pieces.getOrderPiecesViaApi({
                      query: `poLineId=="${testData.orderLine.id}"`,
                    }).then(({ pieces }) => {
                      testData.barcode = uuid();

                      const checkInConfig = CheckIn.getDefaultCheckInConfig({
                        poLineId: pieces[0].poLineId,
                        orderPieceId: pieces[0].id,
                        holdingId: pieces[0].holdingId,
                        barcode: testData.barcode,
                      });
                      CheckIn.createOrderCheckInViaApi(checkInConfig);
                    });

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
                    });
                  })
                  .then(() => {
                    Orders.updateOrderViaApi({
                      ...orderResp,
                      workflowStatus: ORDER_STATUSES.CLOSED,
                    });
                  });
              });
            });
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
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375985 Encumbered amount is not changed after deleting received piece when related approved invoice exists and order is closed (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C375985'] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.orderNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.CLOSED },
          { key: 'Total encumbered', value: '$0.00' },
        ],
      });

      // Click "Actions" button, Select "Receive" option
      const Receivings = OrderDetails.openReceivingsPage();

      // Click <Title name from PO line> link
      const ReceivingDetails = Receivings.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.orderNumber}-1` }],
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
        orderLineDetails: [{ key: 'POL number', value: `${testData.orderNumber}-1` }],
        expected: [],
        received: [],
      });

      // Click "POL number" link in "POL details" accordion
      const OrderLineDetails = ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$25.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
