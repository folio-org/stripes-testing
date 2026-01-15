import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewExpenseClass from '../../../support/fragments/settings/finance/newExpenseClass';
import TopMenu from '../../../support/fragments/topMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';

describe('Funds', () => {
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let budgetId;

  before(() => {
    cy.getAdminToken();
    NewExpenseClass.createViaApi(firstExpenseClass).then((expenseClassId) => {
      firstExpenseClass.id = expenseClassId;
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
          Budgets.createViaApi(defaultBudget).then((budgetResponse) => {
            budgetId = budgetResponse.id;
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Budgets.getBudgetByIdViaApi(budgetId).then((budgetResp) => {
      delete budgetResp.statusExpenseClasses;
      Budgets.updateBudgetViaApi({
        ...budgetResp,
      });
    });
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
      id: budgetId,
      fundId: defaultFund.id,
      ledgerId: defaultLedger.id,
      fiscalYearId: defaultFiscalYear.id,
    });
    ExpenseClasses.deleteExpenseClassViaApi(firstExpenseClass.id);
  });

  it(
    'C15858 Add expense class to budget (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C15858'] },
    () => {
      cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.editBudget();
      Funds.addExpensesClass(firstExpenseClass.name);
      InteractorsTools.checkCalloutMessage(`Budget ${defaultBudget.name} has been saved`);
    },
  );
});
