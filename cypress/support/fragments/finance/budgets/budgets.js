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
  } = {}) {
    const fiscalYear = {
      ...FiscalYears.getDefaultFiscalYear(),
      ...fiscalYearProps,
    };
    const ledger = { ...Ledgers.getDefaultLedger(), ...ledgerProps };
    const fund = { ...Funds.getDefaultFund(), ...fundProps };
    const budget = {
      fiscalYearId: fiscalYear.id,
      fundId: fund.id,
      ...this.getDefaultBudget(),
      ...budgetProps,
    };

    FiscalYears.createViaApi(fiscalYear);
    Ledgers.createViaApi({ ...ledger, fiscalYearOneId: fiscalYear.id });
    Funds.createViaApi({ ...fund, ledgerId: ledger.id });
    this.createViaApi(budget);

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
