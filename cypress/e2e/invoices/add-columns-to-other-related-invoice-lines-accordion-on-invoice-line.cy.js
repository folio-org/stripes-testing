import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceLineDetails, InvoiceView, Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, NumberTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    acquisitionMethodId: null,
    order: {},
    orderLine: {},
    invoiceFirst: {},
    invoiceSecond: {},
    invoiceLineFirst: {
      subTotal: 10,
      subscriptionInfo: `AT_C409409_subscription_first_${getRandomPostfix()}`,
      comment: `AT_C409409_comment_first_${getRandomPostfix()}`,
      subscriptionStart: DateTools.getFormattedDate({ date: new Date() }),
      subscriptionEnd: DateTools.getFormattedDate({ date: DateTools.addDays(7) }),
    },
    invoiceLineSecond: {
      subTotal: 20,
      subscriptionInfo: `AT_C409409_subscription_second_${getRandomPostfix()}`,
      comment: `AT_C409409_comment_second_${getRandomPostfix()}`,
      subscriptionStart: DateTools.getFormattedDate({ date: DateTools.addDays(1) }),
      subscriptionEnd: DateTools.getFormattedDate({ date: DateTools.addDays(14) }),
    },
    user: {},
    locale: {},
  };

  const formatDate = (date) => {
    return DateTools.getFormattedDateInTimezone(
      date,
      testData.locale.timezone,
      testData.locale.locale,
    );
  };
  const formatAmount = (amount, invoice) => {
    return NumberTools.formatCurrency(amount, {
      locale: testData.locale.locale,
      currency: invoice.currency,
    });
  };
  const formatSubscriptionDate = (date) => {
    return new Intl.DateTimeFormat(testData.locale.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(date));
  };

  const createFiscalYearLedgerFundAndBudget = () => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    return cy.then(() => {
      testData.fiscalYear = fiscalYear;
      testData.ledger = ledger;
      testData.fund = fund;
      testData.budget = budget;
    });
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const getAcquisitionMethodId = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;
      });
  };

  const createOpenOrderWithLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: testData.acquisitionMethodId,
            purchaseOrderId: testData.order.id,
            title: `AT_C409409_orderLine_${getRandomPostfix()}`,
            listUnitPrice: 10,
            poLineEstimatedPrice: 10,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;

        return Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const createInvoiceWithLine = (invoiceKey, invoiceLineKey) => {
    return Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.fiscalYear.id,
      accountingCode: testData.organization.erpCode,
    })
      .then((invoice) => {
        testData[invoiceKey] = invoice;

        return Invoices.createInvoiceLineViaApi({
          ...Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            poLineId: testData.orderLine.id,
            fundDistributions: testData.orderLine.fundDistribution,
            ...testData[invoiceLineKey],
          }),
          comment: testData[invoiceLineKey].comment,
        });
      })
      .then((invoiceLine) => {
        testData[invoiceLineKey] = invoiceLine;
      });
  };

  const createInvoiceFirst = () => createInvoiceWithLine('invoiceFirst', 'invoiceLineFirst');

  const createInvoiceSecond = () => createInvoiceWithLine('invoiceSecond', 'invoiceLineSecond');

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        Permissions.uiOrdersView.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });

    createFiscalYearLedgerFundAndBudget()
      .then(createOrganization)
      .then(getAcquisitionMethodId)
      .then(createOpenOrderWithLine)
      .then(createInvoiceFirst)
      .then(createInvoiceSecond)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Invoices.deleteInvoiceViaApi(testData.invoiceFirst.id);
      Invoices.deleteInvoiceViaApi(testData.invoiceSecond.id);
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
        id: testData.budget.id,
        fundId: testData.fund.id,
        ledgerId: testData.ledger.id,
        fiscalYearId: testData.fiscalYear.id,
      });
    });
  });

  it(
    'C409409 Add columns to "Other related invoice lines" accordion on Invoice line (Poppy+) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C409409'] },
    () => {
      // Step 1: Navigate to Invoice #1 details pane
      Invoices.searchByNumber(testData.invoiceFirst.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoiceFirst.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoiceFirst.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ poNumber: testData.orderLine.poLineNumber }],
      });

      // Step 2: Click on invoice line record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: testData.invoiceLineFirst.invoiceLineNumber,
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 3: Check "Other related invoice lines" accordion contains Invoice #2 line
      InvoiceLineDetails.checkRelatedInvoiceLinesTableContent([
        {
          vendorInvoiceNo: testData.invoiceSecond.vendorInvoiceNo,
          invoiceLineNumber: testData.invoiceLineSecond.invoiceLineNumber,
          fiscalYear: testData.fiscalYear.code,
          invoiceDate: formatDate(testData.invoiceSecond.invoiceDate),
          vendorCode: testData.organization.code,
          subscriptionStart: formatSubscriptionDate(testData.invoiceLineSecond.subscriptionStart),
          subscriptionEnd: formatSubscriptionDate(testData.invoiceLineSecond.subscriptionEnd),
          subscriptionInfo: testData.invoiceLineSecond.subscriptionInfo,
          status: testData.invoiceSecond.status,
          quantity: testData.invoiceLineSecond.quantity,
          amount: formatAmount(testData.invoiceLineSecond.total, testData.invoiceSecond),
          comment: testData.invoiceLineSecond.comment,
        },
      ]);

      // Step 4: Navigate to Invoice #2 details pane
      InvoiceLineDetails.closeInvoiceLineDetailsPane();
      Invoices.searchByNumber(testData.invoiceSecond.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoiceSecond.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoiceSecond.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        invoiceLines: [{ poNumber: testData.orderLine.poLineNumber }],
      });

      // Step 5: Click on invoice line record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: testData.invoiceLineSecond.invoiceLineNumber,
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 6: Check "Other related invoice lines" accordion contains Invoice #1 line
      InvoiceLineDetails.checkRelatedInvoiceLinesTableContent([
        {
          vendorInvoiceNo: testData.invoiceFirst.vendorInvoiceNo,
          invoiceLineNumber: testData.invoiceLineFirst.invoiceLineNumber,
          fiscalYear: testData.fiscalYear.code,
          invoiceDate: formatDate(testData.invoiceFirst.invoiceDate),
          vendorCode: testData.organization.code,
          subscriptionStart: formatSubscriptionDate(testData.invoiceLineFirst.subscriptionStart),
          subscriptionEnd: formatSubscriptionDate(testData.invoiceLineFirst.subscriptionEnd),
          subscriptionInfo: testData.invoiceLineFirst.subscriptionInfo,
          status: testData.invoiceFirst.status,
          quantity: testData.invoiceLineFirst.quantity,
          amount: formatAmount(testData.invoiceLineFirst.total, testData.invoiceFirst),
          comment: testData.invoiceLineFirst.comment,
        },
      ]);
    },
  );
});
