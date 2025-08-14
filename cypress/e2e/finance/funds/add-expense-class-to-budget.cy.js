import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewExpenseClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import TopMenu from '../../../support/fragments/topMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';

describe('ui-finance: Funds', () => {
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  before(() => {
    cy.getAdminToken();
    NewExpenseClass.createViaApi(firstExpenseClass).then((expenseClassResponse) => {
      firstExpenseClass.id = expenseClassResponse;
    });
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);
        });
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    cy.getAdminToken();
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.editBudget();
    Funds.deleteExpensesClass();
    Funds.deleteBudgetViaActions();
    InteractorsTools.checkCalloutMessage('Budget has been deleted');
    Funds.checkIsBudgetDeleted();
    Funds.deleteFundViaApi(defaultFund.id);
    SettingsFinance.deleteViaApi(firstExpenseClass.id);
  });

  it(
    'C15858 Add expense class to budget (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.editBudget();
      Funds.addExpensesClass(firstExpenseClass.name);
      InteractorsTools.checkCalloutMessage(`Budget ${defaultBudget.name} has been saved`);
    },
  );
});
