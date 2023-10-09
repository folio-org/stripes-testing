import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Funds', () => {
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '100';

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);

    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultfund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultfund).then((fundResponse) => {
          defaultfund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultfund.name);
          Funds.selectFund(defaultfund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultfund.name);
    Funds.selectFund(defaultfund.name);
    Funds.selectBudgetDetails();
    Funds.editBudget();
    Funds.deleteExpensesClass();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();

    Funds.deleteFundViaApi(defaultfund.id);

    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.deleteExpenseClass(firstExpenseClass);

    Ledgers.deleteledgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C15858 Add expense class to budget (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultfund.name);
      Funds.selectFund(defaultfund.name);
      Funds.selectBudgetDetails();
      Funds.editBudget();
      Funds.addExpensesClass(firstExpenseClass.name);
      InteractorsTools.checkCalloutMessage(
        `Budget ${defaultfund.code}-${defaultFiscalYear.code} has been saved`,
      );
    },
  );
});
