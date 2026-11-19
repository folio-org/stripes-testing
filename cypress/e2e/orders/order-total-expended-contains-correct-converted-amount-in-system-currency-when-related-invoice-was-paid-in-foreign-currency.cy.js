import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCY_CODES,
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
import { Budgets, Funds, TransactionDetails, Transactions } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    fund: {},
    acquisitionMethod: {},
    order: {},
    firstOrderLine: {},
    secondOrderLine: {},
    invoice: {},
    firstOrderLineTitle: `AT_C773200_POL_1_${getRandomPostfix()}`,
    secondOrderLineTitle: `AT_C773200_POL_2_${getRandomPostfix()}`,
    euroExchangeRate: 2,
    poundExchangeRate: 3,
    user: {},
  };

  // System currency must be USD, it is set back if another test changed it
  const setSystemCurrency = () => {
    return cy.getTenantLocaleApi().then((locale) => {
      if (locale.currency !== CURRENCY_CODES.USD) {
        cy.setTenantLocaleApi({ ...locale, currency: CURRENCY_CODES.USD });
      }
    });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createFinanceData = () => {
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
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

  const getOrderLine = ({ title, listUnitPrice, currency, exchangeRate }) => {
    const orderLine = BasicOrderLine.getDefaultOrderLine({
      title,
      listUnitPrice,
      currency,
      purchaseOrderId: testData.order.id,
      acquisitionMethod: testData.acquisitionMethod.id,
      fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
    });

    return { ...orderLine, cost: { ...orderLine.cost, exchangeRate } };
  };

  // POL #1 is in the system currency, POL #2 is in Euro with the exchange rate set manually
  const createOrderWithOrderLines = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          getOrderLine({
            title: testData.firstOrderLineTitle,
            listUnitPrice: 10,
            currency: CURRENCY_CODES.USD,
          }),
        );
      })
      .then((orderLine) => {
        testData.firstOrderLine = orderLine;

        return OrderLines.createOrderLineViaApi(
          getOrderLine({
            title: testData.secondOrderLineTitle,
            listUnitPrice: 5,
            currency: CURRENCY_CODES.EUR,
            exchangeRate: testData.euroExchangeRate,
          }),
        );
      })
      .then((orderLine) => {
        testData.secondOrderLine = orderLine;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.firstOrderLine.id))
      .then((orderLine) => {
        testData.firstOrderLine = orderLine;

        return OrderLines.getOrderLineByIdViaApi(testData.secondOrderLine.id);
      })
      .then((orderLine) => {
        testData.secondOrderLine = orderLine;
      });
  };

  // The invoice is in British Pound with the exchange rate set manually, invoice line amounts are not changed
  const createInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      accountingCode: testData.organization.erpCode,
      fiscalYearId: testData.fiscalYear.id,
      poLineId: testData.firstOrderLine.id,
      invoiceStatus: INVOICE_STATUSES.OPEN,
      currency: CURRENCY_CODES.GBP,
      exchangeRate: testData.poundExchangeRate,
      fundDistributions: testData.firstOrderLine.fundDistribution,
      subTotal: 10,
      releaseEncumbrance: true,
      exportToAccounting: false,
    }).then((invoice) => {
      testData.invoice = invoice;
    });
  };

  const createSecondInvoiceLine = () => {
    return Invoices.createInvoiceLineViaApi(
      Invoices.getDefaultInvoiceLine({
        invoiceId: testData.invoice.id,
        invoiceLineStatus: testData.invoice.status,
        poLineId: testData.secondOrderLine.id,
        fundDistributions: testData.secondOrderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 5,
        releaseEncumbrance: true,
      }),
    );
  };

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
        Permissions.uiOrdersView.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
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
    OrderLinesLimit.setPOLLimitViaApi(2);
    setSystemCurrency()
      .then(createOrganization)
      .then(createFinanceData)
      .then(fetchReferenceData)
      .then(createOrderWithOrderLines)
      .then(openOrder)
      .then(createInvoice)
      .then(createSecondInvoiceLine)
      .then(payInvoice)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C773200 Order\'s "Total expended" value contains correct converted amount in system currency when related invoice was paid in foreign currency (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C773200', 'nonParallel'] },
    () => {
      // Step 1: Go to the order details pane
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$10.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '€5.00' },
          // 10 + 5 x EUR exchange rate
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE_EXCHANGED, value: '$20.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          // (10 + 5) x GBP exchange rate
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$45.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });
      OrderDetails.checkRelatedInvoicesTableContent([
        { vendorInvoiceNumber: testData.invoice.vendorInvoiceNo, invoiceAmount: '£15.00' },
      ]);

      // Step 2: Click on POL #2 record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.secondOrderLineTitle);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: '€5.00',
          // 5 x EUR exchange rate
          initialEncumbrance: '$10.00',
          currentEncumbrance: '$0.00',
        },
      ]);
      OrderLineDetails.checkRelatedInvoiceLinesTableContent([
        { vendorInvoiceNo: testData.invoice.vendorInvoiceNo, amount: '£5.00' },
      ]);

      // Step 3: Click on "Current encumbrance" link in "Fund distribution" accordion
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$10.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          // 5 x GBP exchange rate
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$15.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });

      // Step 4: Check "Payment" transactions related to the invoice on "Transactions" pane
      TransactionDetails.closeTransactionDetails();
      Transactions.checkTransactionsList({
        records: [
          // 10 x GBP exchange rate
          { type: TRANSACTION_TYPES.PAYMENT, amount: '$30.00' },
          // 5 x GBP exchange rate
          { type: TRANSACTION_TYPES.PAYMENT, amount: '$15.00' },
        ],
      });
      Funds.checkTransactionCount(TRANSACTION_TYPES.PAYMENT, 2);
    },
  );
});
