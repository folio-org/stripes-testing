import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Funds', () => {
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const fund = { ...NewFund.defaultFund };

  before(() => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);

    Funds.createFundViaUI(fund)
      .then(
        () => {
          Funds.addBudget(100);
          Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
        }
      );
  });

  after(() => {
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(fund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.editBudget();
    Funds.deleteExpensesClass();
    InteractorsTools.checkCalloutMessage(`Budget ${fund.code}-${DateTools.getCurrentFiscalYearCode()} has been saved`);
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();

    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.deleteExpenseClass(firstExpenseClass);
  });

  it('C15858 Add expense class to budget (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(fund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.editBudget();
    Funds.addExpensesClass(firstExpenseClass.name);
    InteractorsTools.checkCalloutMessage(`Budget ${fund.code}-${DateTools.getCurrentFiscalYearCode()} has been saved`);
  });
});
