import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
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
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    fund: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    firstInvoice: {},
    secondInvoice: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createFinanceData = () => {
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 1000 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
  };

  const fetchReferenceData = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            listUnitPrice: 10,
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

  const createInvoice = ({ subTotal }) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: testData.orderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      fundDistributions: testData.orderLine.fundDistribution,
      subTotal,
      releaseEncumbrance: false,
      exportToAccounting: false,
    });
  };

  const createAndApproveFirstInvoice = () => {
    return createInvoice({ subTotal: 4 }).then((invoice) => {
      testData.firstInvoice = invoice;

      return Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.APPROVED });
    });
  };

  // Invoice #2 has two invoice lines related to the same PO line: $3.00 and -$1.00
  const createAndPaySecondInvoice = () => {
    return createInvoice({ subTotal: 3 })
      .then((invoice) => {
        testData.secondInvoice = invoice;

        return Invoices.createInvoiceLineViaApi(
          Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            poLineId: testData.orderLine.id,
            fundDistributions: testData.orderLine.fundDistribution,
            accountingCode: testData.organization.erpCode,
            subTotal: -1,
            releaseEncumbrance: false,
          }),
        );
      })
      .then(() => {
        return Invoices.changeInvoiceStatusViaApi({
          invoice: testData.secondInvoice,
          status: INVOICE_STATUSES.PAID,
        });
      });
  };

  const unopenOrder = () => {
    return Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      return Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING });
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
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
      .then(createAndApproveFirstInvoice)
      .then(createAndPaySecondInvoice)
      .then(unopenOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1348667 Encumbrance is unreleased after un-opening the order with related Approved and Paid invoices (release encumbrance = false) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1348667'] },
    () => {
      // Step 1: Click on the order number
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$10.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$3.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$1.00' },
        ],
      });

      // Step 2: Click "Actions" button, select "Open" option, click "Submit" button
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$10.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$4.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$3.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$1.00' },
        ],
      });

      // Step 3: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$4.00' },
      ]);

      // Step 4: Click on the "Current encumbrance" link
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($4.00)' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$4.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$3.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        ],
      });
    },
  );
});
