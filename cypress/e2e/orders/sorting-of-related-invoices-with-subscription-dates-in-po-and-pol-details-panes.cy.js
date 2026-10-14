import moment from 'moment';
import {
  APPLICATION_NAMES,
  FUND_DISTRIBUTION_TYPES,
  ORDER_STATUSES,
  RELATED_INVOICE_LINES_TABLE_COLUMN_HEADERS,
  RELATED_INVOICES_TABLE_COLUMN_HEADERS,
  SORT_DIRECTIONS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Localization from '../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../support/fragments/settings/tenant/tenantPane';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import { formatDate } from '../../support/utils/acquisitions';
import getRandomStringCode from '../../support/utils/generateTextCode';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

const TIMEZONE_UTC = 'UTC';
const TIMEZONE_POSITIVE_OFFSET = 'Europe/Athens';
const TIMEZONE_NEGATIVE_OFFSET = 'Pacific/Honolulu';
const BUDGET_ALLOCATED_AMOUNT = 1000;
const POL_UNIT_PRICE = 10;
const INVOICE_SUBTOTAL = 10;
const SUBSCRIPTION_DURATION_DAYS = 5;
const PAST_INVOICE_DATE_OFFSET_DAYS = -30;
const CURRENT_INVOICE_DATE_OFFSET_DAYS = 0;
const FUTURE_INVOICE_DATE_OFFSET_DAYS = 30;
const SUBSCRIPTION_DATE_FORMAT = 'YYYY-MM-DD';
const POL_TITLE_PREFIX = 'AT_C813671_POL';
const INVOICE_DATE_COLUMN = RELATED_INVOICES_TABLE_COLUMN_HEADERS.INVOICE_DATE;
const INVOICE_LINE_DATE_COLUMN = RELATED_INVOICE_LINES_TABLE_COLUMN_HEADERS.INVOICE_DATE;

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const R = {
    ORIGINAL_LOCALE: 'originalLocale',
    LOCALE: 'locale',
    ORG: 'org',
    FY: 'fy',
    LEDGER: 'ledger',
    FUND: 'fund',
    BUDGET: 'budget',
    ORDER: 'order',
    ORDER_LINE: 'orderLine',
    INVOICE_PAST: 'invoicePast',
    INVOICE_CURRENT: 'invoiceCurrent',
    INVOICE_FUTURE: 'invoiceFuture',
    USER: 'user',
  };

  const formatInvoiceDate = (invoiceDate) => {
    return formatDate(flow.get(R.LOCALE), invoiceDate, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  // subscription dates are date-only values, so they must be displayed without any timezone shift
  const formatSubscriptionDate = (subscriptionDate) => {
    return formatDate(
      { locale: flow.get(R.LOCALE).locale, timezone: TIMEZONE_UTC },
      subscriptionDate,
      { year: 'numeric', month: '2-digit', day: '2-digit' },
    );
  };

  const getInvoiceRelatedRecord = (key) => {
    const { invoice, subscriptionStart, subscriptionEnd } = flow.get(key);

    return {
      invoiceNumber: invoice.folioInvoiceNo,
      vendorInvoiceNo: invoice.vendorInvoiceNo,
      invoiceDate: formatInvoiceDate(invoice.invoiceDate),
      subscriptionStart: formatSubscriptionDate(subscriptionStart),
      subscriptionEnd: formatSubscriptionDate(subscriptionEnd),
    };
  };

  const getRecordsInDescendingOrder = () => {
    return [R.INVOICE_FUTURE, R.INVOICE_CURRENT, R.INVOICE_PAST].map(getInvoiceRelatedRecord);
  };

  const getRecordsInAscendingOrder = () => {
    return [R.INVOICE_PAST, R.INVOICE_CURRENT, R.INVOICE_FUTURE].map(getInvoiceRelatedRecord);
  };

  const assertSubscriptionDatesInRelatedInvoiceLines = () => {
    OrderLineDetails.checkRelatedInvoiceLinesTableContent(getRecordsInDescendingOrder());
  };

  const createInvoiceWithSubscription = (f, key, dateOffsetDays) => {
    const invoiceMoment = moment.utc().add(dateOffsetDays, 'days');
    const subscriptionStart = invoiceMoment.format(SUBSCRIPTION_DATE_FORMAT);
    const subscriptionEnd = invoiceMoment
      .clone()
      .add(SUBSCRIPTION_DURATION_DAYS, 'days')
      .format(SUBSCRIPTION_DATE_FORMAT);

    return Invoices.createInvoiceViaApi({
      vendorId: f.get(R.ORG).id,
      fiscalYearId: f.get(R.FY).id,
      accountingCode: f.get(R.ORG).erpCode,
      invoiceDate: invoiceMoment.format(),
      currency: f.get(R.LOCALE).currency,
    }).then((invoice) => {
      f.set(key, { invoice, subscriptionStart, subscriptionEnd }, (v) => {
        return Invoices.deleteInvoiceViaApi(v.invoice.id);
      });

      return Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: invoice.id,
          invoiceLineStatus: invoice.status,
          poLineId: f.get(R.ORDER_LINE).id,
          fundDistributions: f.get(R.ORDER_LINE).fundDistribution,
          subTotal: INVOICE_SUBTOTAL,
          subscriptionStart,
          subscriptionEnd,
        }),
      );
    });
  };

  const changeTimezoneAndCheckSubscriptionDates = (timezone) => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
    TenantPane.goToTenantTab();
    TenantPane.waitLoading();
    TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
    Localization.changeTimezone(timezone);
    Localization.clickSaveButton();

    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS); // At this step navigation should keep orders path in cache
    Orders.waitLoading();
    Orders.selectOrderByPONumber(flow.get(R.ORDER).poNumber);
    OrderDetails.openPolDetails(flow.get(R.ORDER_LINE).titleOrPackage);
    assertSubscriptionDatesInRelatedInvoiceLines();
  };

  before('Create C813671 preconditions', () => {
    cy.getAdminToken();
    flow
      .step((f) => {
        return cy.getTenantLocaleApi().then((locale) => f.set(R.ORIGINAL_LOCALE, locale));
      })
      .step((f) => {
        // Precondition 1: Time zone is set to UTC in Settings > Tenant > Language and localization
        const utcLocale = { ...f.get(R.ORIGINAL_LOCALE), timezone: TIMEZONE_UTC };

        return cy.setTenantLocaleApi(utcLocale).then(() => {
          return f.set(R.LOCALE, utcLocale, () => cy.setTenantLocaleApi(f.get(R.ORIGINAL_LOCALE)));
        });
      })
      .step((f) => {
        // Precondition: Organization-vendor for the order and invoices
        return Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization(), {
          returnBody: true,
        }).then((org) => f.set(R.ORG, org, (v) => Organizations.deleteOrganizationViaApi(v.id)));
      })
      .step((f) => {
        // Precondition 2: Current fiscal year for Fund A budget
        const series = getRandomStringCode(4);
        const periods = DateTools.getFullFiscalYearStartAndEnd();

        return FiscalYears.createViaApi({
          ...FiscalYears.getDefaultFiscalYear(),
          ...periods,
          series,
          code: `${series}${new Date(periods.periodStart).getFullYear()}`,
          currency: f.get(R.LOCALE).currency,
        }).then((fy) => f.set(R.FY, fy, (v) => FiscalYears.deleteFiscalYearViaApi(v.id, false)));
      })
      .step((f) => {
        // Precondition 2: Ledger related to the fiscal year
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: f.get(R.FY).id,
        }).then((ledger) => f.set(R.LEDGER, ledger, (v) => Ledgers.deleteLedgerViaApi(v.id, false)));
      })
      .step((f) => {
        // Precondition 2: Active Fund A
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: f.get(R.LEDGER).id,
        }).then((response) => {
          return f.set(R.FUND, response.fund, (v) => Funds.deleteFundViaApi(v.id, false));
        });
      })
      .step((f) => {
        // Precondition 2: Current budget with money allocation for Fund A
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          allocated: BUDGET_ALLOCATED_AMOUNT,
          fiscalYearId: f.get(R.FY).id,
          fundId: f.get(R.FUND).id,
        }).then((budget) => f.set(R.BUDGET, budget, (v) => Budgets.deleteViaApi(v.id, false)));
      })
      .step((f) => {
        // Precondition 3: Order with one PO line
        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: f.get(R.ORG).id }),
        ).then((order) => f.set(R.ORDER, order, (v) => Orders.deleteOrderViaApi(v.id, false)));
      })
      .step((f) => {
        // Precondition 3: PO line with Fund A in fund distribution and cost within the budget
        return cy.getAcquisitionMethodsApi().then(({ body }) => {
          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: f.get(R.ORDER).id,
              acquisitionMethod: body.acquisitionMethods[0].id,
              title: `${POL_TITLE_PREFIX}_${getRandomPostfix()}`,
              currency: f.get(R.LOCALE).currency,
              fundDistribution: [
                {
                  code: f.get(R.FUND).code,
                  fundId: f.get(R.FUND).id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
              listUnitPrice: POL_UNIT_PRICE,
              poLineEstimatedPrice: POL_UNIT_PRICE,
            }),
          ).then((orderLine) => f.set(R.ORDER_LINE, orderLine));
        });
      })
      .step((f) => {
        // Precondition 3: Order is in Open status
        return Orders.updateOrderViaApi({
          ...f.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .step((f) => {
        // Precondition 4: Invoice #1 based on the order, Subscription start/end populated, past Invoice date
        return createInvoiceWithSubscription(f, R.INVOICE_PAST, PAST_INVOICE_DATE_OFFSET_DAYS);
      })
      .step((f) => {
        // Precondition 4: Invoice #2 based on the order, Subscription start/end populated, current Invoice date
        return createInvoiceWithSubscription(
          f,
          R.INVOICE_CURRENT,
          CURRENT_INVOICE_DATE_OFFSET_DAYS,
        );
      })
      .step((f) => {
        // Precondition 4: Invoice #3 based on the order, Subscription start/end populated, future Invoice date
        return createInvoiceWithSubscription(f, R.INVOICE_FUTURE, FUTURE_INVOICE_DATE_OFFSET_DAYS);
      })
      .step((f) => {
        // Precondition 5: User with Orders view and Settings (tenant) language and localization permissions
        return cy
          .createTempUser([
            Permissions.uiOrdersView.gui,
            Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
          ])
          .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
      })
      .step((f) => {
        // Precondition 6: User is logged in and is in Orders app
        return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: `${TopMenu.ordersPath}/view/${f.get(R.ORDER).id}`,
          waiter: OrderDetails.waitLoading,
        });
      });
  });

  after('Delete C813671 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C813671 Sorting of related invoices with the populated Subscription start and Subscription end dates in the PO and POL details panes (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C813671', 'nonParallel'] },
    () => {
      cy.log('<--- STEP 1 --->');
      OrderDetails.assertRelatedInvoicesSortDirection(
        INVOICE_DATE_COLUMN,
        SORT_DIRECTIONS.DESCENDING,
      );
      OrderDetails.assertRelatedInvoicesSorted(INVOICE_DATE_COLUMN, SORT_DIRECTIONS.DESCENDING);
      OrderDetails.checkRelatedInvoicesTableContent(getRecordsInDescendingOrder());

      cy.log('<--- STEP 2 --->');
      OrderDetails.sortRelatedInvoicesBy(INVOICE_DATE_COLUMN);
      OrderDetails.assertRelatedInvoicesSortDirection(
        INVOICE_DATE_COLUMN,
        SORT_DIRECTIONS.ASCENDING,
      );
      OrderDetails.assertRelatedInvoicesSorted(INVOICE_DATE_COLUMN, SORT_DIRECTIONS.ASCENDING);
      OrderDetails.checkRelatedInvoicesTableContent(getRecordsInAscendingOrder());

      cy.log('<--- STEP 3 --->');
      OrderDetails.openPolDetails(flow.get(R.ORDER_LINE).titleOrPackage);
      OrderLineDetails.assertRelatedInvoiceLinesRowCount(getRecordsInDescendingOrder().length);
      assertSubscriptionDatesInRelatedInvoiceLines();
      OrderLineDetails.assertRelatedInvoiceLinesSortDirection(
        INVOICE_LINE_DATE_COLUMN,
        SORT_DIRECTIONS.DESCENDING,
      );
      OrderLineDetails.assertRelatedInvoiceLinesSorted(
        INVOICE_LINE_DATE_COLUMN,
        SORT_DIRECTIONS.DESCENDING,
      );

      cy.log('<--- STEP 4 Skip since Umbrellaleaf --->');
      cy.log('<--- STEP 5 --->');
      OrderLineDetails.sortRelatedInvoiceLinesBy(INVOICE_LINE_DATE_COLUMN);
      OrderLineDetails.assertRelatedInvoiceLinesSortDirection(
        INVOICE_LINE_DATE_COLUMN,
        SORT_DIRECTIONS.ASCENDING,
      );
      OrderLineDetails.assertRelatedInvoiceLinesSorted(
        INVOICE_LINE_DATE_COLUMN,
        SORT_DIRECTIONS.ASCENDING,
      );
      OrderLineDetails.checkRelatedInvoiceLinesTableContent(getRecordsInAscendingOrder());

      cy.log('<--- STEP 6-7 --->');
      changeTimezoneAndCheckSubscriptionDates(TIMEZONE_POSITIVE_OFFSET);

      cy.log('<--- STEP 8-9 --->');
      changeTimezoneAndCheckSubscriptionDates(TIMEZONE_NEGATIVE_OFFSET);
    },
  );
});
