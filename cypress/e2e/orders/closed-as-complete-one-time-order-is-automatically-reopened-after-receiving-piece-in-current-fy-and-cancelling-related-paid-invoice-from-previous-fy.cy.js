import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
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
  Budgets,
  FiscalYears,
  LedgerRollovers,
  TransactionDetails,
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
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
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
    order: {},
    orderLine: {},
    invoice: {},
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

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    })
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            listUnitPrice: 100,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const createAndPayInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYears.first.id,
      poLineId: testData.orderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: testData.orderLine.fundDistribution,
      subTotal: 100,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      testData.invoice = invoice;

      return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
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

  // The order is closed as complete automatically, because the PO line is fully received and fully paid
  const receivePiece = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then(([piece]) => {
      return Receiving.receivePieceViaApi({
        poLineId: testData.orderLine.id,
        pieces: [{ id: piece.id }],
      });
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
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
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(createAndPayInvoice)
      .then(rolloverLedger)
      .then(shiftFiscalYearDates)
      .then(receivePiece)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1322693 Closed as complete one-time order is automatically reopened after receiving a piece in the current FY and cancelling the related paid invoice from the previous FY (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1322693'] },
    () => {
      // Step 1: Click on the order number
      Orders.selectOrderByPONumber(testData.order.poNumber);
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
        { name: testData.fund.name, initialEncumbrance: '$100.00', currentEncumbrance: '$0.00' },
      ]);

      // Step 3: Go back to the order, click on the invoice number in "Related invoices" accordion
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openInvoice(testData.invoice.id);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceCanNotBeApprovedWarning(InvoiceStates.POLineFullyPaid);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
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
        title: testData.invoice.vendorInvoiceNo,
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
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });

      // Step 6: Click on the PO line number link in the "Source" field
      TransactionDetails.openSourceInTransactionDetails(testData.orderLine.poLineNumber);
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
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
