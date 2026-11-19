import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  LOCATION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { Budgets, TransactionDetails } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
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

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
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

  const receivePiece = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then(([piece]) => {
      return Receiving.receivePieceViaApi({
        poLineId: testData.orderLine.id,
        pieces: [{ id: piece.id }],
      });
    });
  };

  const createInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: testData.orderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: testData.orderLine.fundDistribution,
      subTotal: 100,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  // The order is closed as complete automatically, because the PO line is fully received and fully paid
  const payInvoice = () => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice: testData.invoice,
      status: INVOICE_STATUSES.PAID,
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
      .then(receivePiece)
      .then(createInvoice)
      .then(payInvoice)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1322690 Closed as complete one-time order is automatically reopened after cancelling the related paid invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1322690'] },
    () => {
      // Step 1: Click on the order number
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 2: Click on the invoice number in "Related invoices" accordion
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

      // Step 3: Cancel the invoice
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

      // Step 4: Click on the invoice line, click on the "Current encumbrance" link
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
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

      // Step 5: Click on the PO line number link in the "Source" field
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

      // Step 6: Click "Actions" button, select "View PO" option
      OrderLines.viewPO();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$100.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });
    },
  );
});
