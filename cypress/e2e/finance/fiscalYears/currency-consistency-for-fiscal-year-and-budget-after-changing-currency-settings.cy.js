import moment from 'moment';
import { COMMON_BUTTON_LABELS } from '../../../support/constants';
import { FISCAL_YEARS_VIEW_FIELDS } from '../../../support/constants/finance/fiscal-year';
import { Permissions } from '../../../support/dictionary';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import FiscalYearDetails from '../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import Localization, {
  CURRENCIES,
} from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../../support/utils';
import { formatDateTime, getFieldRelativeDateForLocale } from '../../../support/utils/acquisitions';
import { Button, TextArea } from '../../../../interactors';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

describe('Finance', () => {
  const flow = new ExecutionFlowManager();
  const R = {
    LOCALE: 'locale',
    FISCAL_YEAR: 'fiscalYear',
    LEDGER: 'ledger',
    FUND: 'fund',
    BUDGET: 'budget',
    USER: 'user',
  };
  const fiscalYear = {
    ...FiscalYears.getDefaultFiscalYear(),
    currency: CURRENCIES.EURO.value,
  };
  let newFiscalYear;
  const description = `Edited by C590814 ${fiscalYear.code}`;

  const waitForFilters = (pane, trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane,
    phase: PANE_REQUEST_PHASES.FILTERS,
    trigger,
  });
  const waitForResults = (pane, trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane,
    phase: PANE_REQUEST_PHASES.RESULTS,
    trigger,
  });
  const fiscalYearInformation = (currency) => [
    {
      key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY,
      value: currency.value,
    },
    {
      key: FISCAL_YEARS_VIEW_FIELDS.PERIOD_START_DATE,
      value: formatDateTime(
        { locale: flow.get(R.LOCALE).locale, timezone: 'UTC' },
        fiscalYear.periodStart,
      ),
    },
    {
      key: FISCAL_YEARS_VIEW_FIELDS.PERIOD_END_DATE,
      value: formatDateTime(
        { locale: flow.get(R.LOCALE).locale, timezone: 'UTC' },
        moment.utc(fiscalYear.periodEnd).endOf('day').toISOString(),
      ),
    },
  ];

  before(() => {
    cy.log('Precondition 1. Set tenant primary currency to EUR via API');
    cy.log('Precondition 2. Create active Fiscal year #1 containing today');
    cy.log('Precondition 3. Create an active ledger related to Fiscal year #1');
    cy.log('Precondition 4. Create Fund A and its current budget related to the ledger');
    cy.getAdminToken().then(() => {
      cy.getTenantLocaleApi().then((locale) => {
        flow.set(R.LOCALE, locale, (originalLocale) => cy.setTenantLocaleApi(originalLocale));
        cy.setTenantLocaleApi({ ...locale, currency: CURRENCIES.EURO.value });
        newFiscalYear = {
          ...NewFiscalYear.defaultFiscalYear,
          periodBeginDate: getFieldRelativeDateForLocale(locale, -1),
          periodEndDate: getFieldRelativeDateForLocale(locale),
        };
      });

      const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear,
        budget: { allocated: 100 },
      });
      FiscalYears.getViaApi({ query: `id==${financeData.fiscalYear.id}` }).then(
        ({ fiscalYears = [] }) => {
          expect(fiscalYears[0]?.currency).to.equal(CURRENCIES.EURO.value);
        },
      );
      flow.set(R.FISCAL_YEAR, financeData.fiscalYear, (value) => FiscalYears.deleteFiscalYearViaApi(value.id, false));
      flow.set(R.LEDGER, financeData.ledger, (value) => Ledgers.deleteLedgerViaApi(value.id, false));
      flow.set(R.FUND, financeData.fund, (value) => Funds.deleteFundViaApi(value.id, false));
      flow.set(R.BUDGET, financeData.budget, (value) => Budgets.deleteViaApi(value.id, false));
    });

    cy.log('Precondition 5. Grant the required Finance and tenant locale permissions');
    cy.log('Precondition 6. Grant the required Eureka capabilities');
    cy.log('Precondition 7. Use the same permissions as the capability set');
    cy.createTempUser([
      Permissions.uiFinanceViewEditCreateFiscalYear.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
    ]).then((user) => {
      flow.set(R.USER, user, (value) => Users.deleteViaApi(value.userId));
      cy.log('Precondition 8. Open Finance with Fiscal year #1 in the Fiscal year results');
      cy.login(user.username, user.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C590814 Currency consistency for Fiscal Year and Budget after changing currency settings',
    { tags: ['criticalPath', 'thunderjet', 'C590814'] },
    () => {
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FISCAL_YEARS, () => FinanceHelper.searchByName(fiscalYear.name));

      cy.log('Step 1. Open Fiscal year #1 and verify EUR and UTC period boundaries');
      FiscalYears.selectFiscalYear(fiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        information: fiscalYearInformation(CURRENCIES.EURO),
      });

      cy.log('Step 2. Open Fund A and verify its currency is EUR');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FUNDS, () => FinanceHelper.selectFundsNavigation());
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FUNDS, () => FinanceHelper.searchByName(flow.get(R.FUND).name));
      Funds.selectFund(flow.get(R.FUND).name);
      FundDetails.checkFundDetails({
        information: [{ key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY, value: CURRENCIES.EURO.value }],
      });

      cy.log('Step 3. Open the active current budget and verify its currency is EUR');
      const BudgetDetails = FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        information: [{ key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY, value: CURRENCIES.EURO.value }],
      });

      cy.log('Step 4. Change the tenant primary currency to US Dollar (USD) and save');
      cy.visit(SettingsMenu.tenantPath);
      TenantPane.waitLoading();
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.waitLoading();
      Localization.changePrimaryCurrency(CURRENCIES.US_DOLLAR);
      Localization.clickSaveButton();
      Localization.checkPrimaryCurrency(CURRENCIES.US_DOLLAR);

      cy.log('Step 5. Reopen Fiscal year #1 and verify it remains EUR with unchanged dates');
      cy.visit(TopMenu.fiscalYearPath);
      FiscalYears.waitLoading();
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FISCAL_YEARS, () => FinanceHelper.searchByName(fiscalYear.name));
      FiscalYears.selectFiscalYear(fiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        information: fiscalYearInformation(CURRENCIES.EURO),
      });

      cy.log('Step 6. Edit Fiscal year #1 description and verify EUR and dates after saving');
      FiscalYears.editFiscalYearDetails();
      cy.do(TextArea({ name: 'description' }).fillIn(description));
      cy.do(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE).click());
      FiscalYearDetails.waitLoading();
      FiscalYearDetails.checkFiscalYearDetails({
        information: fiscalYearInformation(CURRENCIES.EURO),
      });

      cy.log('Step 7. Reopen Fund A and verify its currency remains EUR');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FUNDS, () => FinanceHelper.selectFundsNavigation());
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FUNDS, () => FinanceHelper.searchByName(flow.get(R.FUND).name));
      Funds.selectFund(flow.get(R.FUND).name);
      FundDetails.checkFundDetails({
        information: [{ key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY, value: CURRENCIES.EURO.value }],
      });

      cy.log('Step 8. Verify the current budget remains EUR and close its pane');
      FundDetails.openCurrentBudgetDetails().checkBudgetDetails({
        information: [{ key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY, value: CURRENCIES.EURO.value }],
      });
      BudgetDetails.closeBudgetDetails();

      cy.log('Step 9. Create a new Fiscal year and verify its currency is USD');
      FundDetails.closeFundDetails();
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FISCAL_YEARS, () => FinanceHelper.selectFiscalYearsNavigation());
      FiscalYears.createDefaultFiscalYear(newFiscalYear);
      FiscalYearDetails.waitLoading();
      FiscalYearDetails.checkFiscalYearDetails({
        information: [
          { key: FISCAL_YEARS_VIEW_FIELDS.CURRENCY, value: CURRENCIES.US_DOLLAR.value },
        ],
      });
    },
  );
});
