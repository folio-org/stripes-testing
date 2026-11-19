import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { Budgets } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Invoices } from '../../support/fragments/invoices';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    fund: {},
    location: {},
    materialType: {},
    acquisitionMethod: {},
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createFinanceData = () => {
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      ledger: { restrictEncumbrance: true, restrictExpenditures: true },
      budget: { allocated: 1000 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
  };

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() =>
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }),
      )
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOpenOrderWithOrderLine = ({ quantity, listUnitPrice }) => {
    const data = {};

    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        data.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            quantity,
            listUnitPrice,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          }),
        );
      })
      .then((orderLine) => {
        data.orderLine = orderLine;

        return Orders.updateOrderViaApi({ ...data.order, workflowStatus: ORDER_STATUSES.OPEN });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(data.orderLine.id))
      .then((orderLine) => ({ ...data, orderLine }));
  };

  const createOrders = () => {
    return createOpenOrderWithOrderLine({ quantity: 1, listUnitPrice: 100 })
      .then(({ order, orderLine }) => {
        testData.firstOrder = order;
        testData.firstOrderLine = orderLine;

        return createOpenOrderWithOrderLine({ quantity: 2, listUnitPrice: 50 });
      })
      .then(({ order, orderLine }) => {
        testData.secondOrder = order;
        testData.secondOrderLine = orderLine;
      });
  };

  const receiveAllPieces = (orderLine) => {
    return Receivings.getPiecesViaApi(orderLine.id).then((pieces) => {
      return Receivings.receivePieceViaApi({
        poLineId: orderLine.id,
        pieces: pieces.map(({ id }) => ({ id })),
      });
    });
  };

  const receivePieces = () => {
    return receiveAllPieces(testData.firstOrderLine).then(() =>
      receiveAllPieces(testData.secondOrderLine),
    );
  };

  const createAndPayInvoice = (orderLine) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: orderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: orderLine.fundDistribution,
      subTotal: orderLine.cost.poLineEstimatedPrice,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
    });
  };

  // Both orders are closed as complete automatically, because their PO lines are fully received and fully paid
  const createAndPayInvoices = () => {
    return createAndPayInvoice(testData.firstOrderLine).then(() =>
      createAndPayInvoice(testData.secondOrderLine),
    );
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createFinanceData)
      .then(fetchReferenceData)
      .then(createOrders)
      .then(receivePieces)
      .then(createAndPayInvoices)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.firstOrderLine.instanceId,
    );
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.secondOrderLine.instanceId,
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1348676 Closed as complete one-time order is automatically reopened after unreceiving a piece (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1348676'] },
    () => {
      // Step 1: Click on the Order #1 number
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          {
            key: ORDER_VIEW_FIELD_LABELS.REASON_FOR_CLOSURE,
            value: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
          },
        ],
      });

      // Step 2: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
          {
            key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
            value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID,
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$0.00' },
      ]);

      // Step 3: Click "Actions" button, select "Receive" option, click on the Title name
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.firstOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.firstOrderLine.titleOrPackage);
      Receivings.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE });
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 4: Unreceive the piece from the "Received" accordion
      Receivings.unreceivePiece();
      Receivings.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
        isDisplayed: false,
      });
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 5: Click on the PO line number link
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
        isDisplayed: false,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
          },
          {
            key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
            value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID,
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$0.00' },
      ]);

      // Step 6: Click "Actions" button, select "View PO" option
      OrderLines.viewPO();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 7: Navigate to the Order #2
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 8: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
          {
            key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
            value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID,
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$0.00' },
      ]);

      // Step 9: Click "Actions" button, select "Receive" option, click on the Title name
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.secondOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.secondOrderLine.titleOrPackage);
      Receivings.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE });
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 10: Click on any piece in the "Received" accordion, select "Unreceive" option
      ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 11: Click on the PO line number link
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
        isDisplayed: false,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
          {
            key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
            value: ORDER_LINE_PAYMENT_STATUS.FULLY_PAID,
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$0.00' },
      ]);

      // Step 12: Click "Actions" button, select "View PO" option
      OrderLines.viewPO();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });
    },
  );
});
