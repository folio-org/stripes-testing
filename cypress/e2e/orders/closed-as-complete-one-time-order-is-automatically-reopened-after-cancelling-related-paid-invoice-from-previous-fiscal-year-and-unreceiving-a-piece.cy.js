import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  LEDGER_ROLLOVER_ORDER_TYPES,
  LOCATION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';

describe('Orders', () => {
  const code = CodeTools(4);
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    ledger: {},
    fund: {},
    location: {},
    materialType: {},
    acquisitionMethod: {},
    firstOrder: {},
    firstOrderLine: {},
    firstInvoice: {},
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
    FiscalYears.createViaApi(testData.fiscalYears.second);

    const { ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      fiscalYear: testData.fiscalYears.first,
      budget: { allocated: 1000 },
    });

    testData.ledger = ledger;
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

    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
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
    return createOpenOrderWithOrderLine({ quantity: 2, listUnitPrice: 50 })
      .then(({ order, orderLine }) => {
        testData.firstOrder = order;
        testData.firstOrderLine = orderLine;

        return createOpenOrderWithOrderLine({ quantity: 1, listUnitPrice: 100 });
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
      fiscalYearId: testData.fiscalYears.first.id,
      poLineId: orderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: orderLine.fundDistribution,
      subTotal: orderLine.cost.poLineEstimatedPrice,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID }).then(
        () => invoice,
      );
    });
  };

  // Both orders are closed as complete automatically, because their PO lines are fully received and fully paid
  const createAndPayInvoices = () => {
    return createAndPayInvoice(testData.firstOrderLine).then((invoice) => {
      testData.firstInvoice = invoice;

      return createAndPayInvoice(testData.secondOrderLine);
    });
  };

  const rolloverLedger = () => {
    return LedgerRollovers.createLedgerRolloverViaApi(
      LedgerRollovers.generateLedgerRollover({
        ledger: testData.ledger,
        fromFiscalYear: testData.fiscalYears.first,
        toFiscalYear: testData.fiscalYears.second,
        needCloseBudgets: false,
        encumbrancesRollover: [
          {
            orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
            basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
          },
        ],
      }),
    );
  };

  const updateFiscalYearDates = (fiscalYear, offset) => {
    return FiscalYears.getViaApi({ query: `id==${fiscalYear.id}` }).then(({ fiscalYears }) => {
      return FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears[0],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      });
    });
  };

  // The second fiscal year becomes the current one
  const shiftFiscalYearDates = () => {
    return updateFiscalYearDates(testData.fiscalYears.first, -1).then(() =>
      updateFiscalYearDates(testData.fiscalYears.second, 0),
    );
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEdit.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
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
      .then(rolloverLedger)
      .then(shiftFiscalYearDates)
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
    'C1322692 Closed as complete one-time order is automatically reopened after cancelling the related paid invoice from the previous Fiscal year and unreceiving a piece (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1322692'] },
    () => {
      // Step 1: Click on the Order #1 number
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
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
        { name: testData.fund.name, initialEncumbrance: '-', currentEncumbrance: '-' },
      ]);

      // Step 3: Go back to the order, click on the invoice number in "Related invoices" accordion
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openInvoice(testData.firstInvoice.id);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceCanNotBeApprovedWarning(InvoiceStates.POLineFullyPaid);
      InvoiceView.checkInvoiceDetails({
        title: testData.firstInvoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
        invoiceLines: [{ poStatus: ORDER_STATUSES.CLOSED }],
      });

      // Step 4: Cancel the invoice
      InvoiceView.cancelInvoice();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceWarningAbsent(InvoiceStates.POLineFullyPaid);
      InvoiceView.checkInvoiceDetails({
        title: testData.firstInvoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
        invoiceLines: [{ poStatus: ORDER_STATUSES.OPEN }],
      });

      // Step 5: Click on the invoice line, click on the "Current encumbrance" link
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($100.00)' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.firstOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 6: Click on the PO line number link in the "Source" field
      TransactionDetails.openSourceInTransactionDetails(testData.firstOrderLine.poLineNumber);
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
            value: ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT,
          },
        ],
      });
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$100.00' },
      ]);

      // Step 7: Click on the "Current encumbrance" link
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($100.00)' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.firstOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 8: Navigate to the Order #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 9: Click on the PO line record in the "PO lines" accordion
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
        { name: testData.fund.name, initialEncumbrance: '-', currentEncumbrance: '-' },
      ]);

      // Step 10: Click "Actions" button, select "Receive" option, click on the Title name
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.secondOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.secondOrderLine.titleOrPackage);
      Receivings.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE });
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 11: Unreceive the piece from the "Received" accordion
      Receivings.unreceivePiece();
      Receivings.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.COMPLETE,
        isDisplayed: false,
      });
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 12: Click on the PO line number link
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
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$100.00' },
      ]);

      // Step 13: Click on the "Current encumbrance" link
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($100.00)' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.secondOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 14: Close the "Transaction" page and the "Current budget" page,
      // open the previous budget and click on the "View transactions" link
      Funds.closeBudgetTransactionApp(`${testData.fund.code}-${testData.fiscalYears.second.code}`);
      BudgetDetails.waitLoading();
      BudgetDetails.closeBudgetDetails();
      Funds.selectPreviousBudgetDetails();
      BudgetDetails.waitLoading();
      BudgetDetails.clickViewTransactionsLink();

      // Step 15: Click on the "Encumbrance" transaction for the PO line of the Order #2
      Transactions.selectTransaction(TRANSACTION_TYPES.ENCUMBRANCE, '$0.00');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.secondOrderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });
    },
  );
});
