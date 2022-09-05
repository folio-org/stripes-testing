import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewFiscalYear from '../../../support/fragments/finance/fiscalYears/newFiscalYear';
import NewLedger from '../../../support/fragments/finance/ledgers/newLedger';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Add budget to fund', () => {
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const fund = { ...NewFund.defaultFund };
  const defaultLedger = NewLedger.defaultLedger;
  const defaultFiscalYear = { ...NewFiscalYear.defaultFiscalYear };

  before(() => {
    cy.loginAsAdmin();
    cy.visit(`${SettingsMenu.expenseClassesPath}`);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);

    cy.visit(TopMenu.fiscalYearPath);
    FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
    FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);

    cy.visit(TopMenu.ledgerPath);
    Ledgers.createDefaultLedger(defaultLedger);
    Ledgers.checkCreatedLedgerName(defaultLedger);

    Funds.createFundViaUI(fund)
      .then(
        () => {
          Funds.addBudget(100);
          Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
        }
      );
  });

  after(() => {
    Funds.editBudget();
    Funds.deleteExpensesClass();
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();

    cy.visit(`${SettingsMenu.expenseClassesPath}`);
    SettingsFinance.deleteExpenseClass(firstExpenseClass);
  });

  it('C15858 Add expense class to budget (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(fund.name);
    FinanceHelp.selectFromResultsList();
    Funds.seletBudgetDetails();
    Funds.editBudget();
    Funds.addExpensesClass(firstExpenseClass.name);
    InteractorsTools.checkCalloutMessage(`Budget ${fund.code} has been saved`);
    // Need to wait callout message
    cy.wait(4000);
  });
});
