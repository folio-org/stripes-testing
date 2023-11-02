import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import FiscalYears from '../fiscalYears/fiscalYears';
import Ledgers from '../ledgers/ledgers';
import Funds from '../funds/funds';

export default {
  getDefaultBudget() {
    return {
      id: uuid(),
      name: `autotest_budget_${getRandomPostfix()}`,
      allocated: 50,
      allowableEncumbrance: 100,
      allowableExpenditure: 100,
      budgetStatus: 'Active',
    };
  },
  getBudgetViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'finance/budgets',
        searchParams,
      })
      .then((response) => {
        return response.body;
      });
  },
  getBudgetByIdViaApi(budgetId) {
    return cy
      .okapiRequest({
        path: `finance/budgets/${budgetId}`,
      })
      .then((response) => {
        return response.body;
      });
  },
  createViaApi(budgetProperties) {
    return cy
      .okapiRequest({
        path: 'finance/budgets',
        body: budgetProperties,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  updateBudgetViaApi(budget) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `finance/budgets/${budget.id}`,
        body: budget,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteViaApi(budgetId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance/budgets/${budgetId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  createBudgetWithFundLedgerAndFYViaApi({
    fiscalYear: fiscalYearProps,
    ledger: ledgerProps,
    fund: fundProps,
    budget: budgetProps,
    expenseClasses = [],
  } = {}) {
    const fiscalYear = {
      ...FiscalYears.getDefaultFiscalYear(),
      ...fiscalYearProps,
    };
    const ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: fiscalYear.id,
      ...ledgerProps,
    };
    const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id, ...fundProps };
    const budget = {
      fiscalYearId: fiscalYear.id,
      fundId: fund.id,
      ...this.getDefaultBudget(),
      ...budgetProps,
    };

    FiscalYears.createViaApi(fiscalYear);
    Ledgers.createViaApi(ledger);
    Funds.createViaApi(fund);

    this.createViaApi(budget).then((resp) => {
      if (expenseClasses.length) {
        this.updateBudgetViaApi({
          ...resp,
          _version: resp._version + 1,
          statusExpenseClasses: expenseClasses.map(({ id }) => ({
            status: 'Active',
            expenseClassId: id,
          })),
        });
      }
    });

    return {
      fiscalYear,
      ledger,
      fund,
      budget: {
        ...budget,
        ledgerId: ledger.id,
      },
    };
  },
  deleteBudgetWithFundLedgerAndFYViaApi({ id: budgetId, fundId, ledgerId, fiscalYearId }) {
    this.deleteViaApi(budgetId);
    Funds.deleteFundViaApi(fundId);
    Ledgers.deleteledgerViaApi(ledgerId);
    FiscalYears.deleteFiscalYearViaApi(fiscalYearId);
  },
};
