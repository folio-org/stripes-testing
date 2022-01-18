import newFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';

describe('ui-finance: Add budget to fund', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C4057 should add budget for a new fund', { tags: [testType.smoke] }, () => {
    cy.createFundViaUI(fund)
      .then(createdLedger => { createdLedgerId = createdLedger.id; });
    Funds.addBudget(0);
    Funds.checkCreatedBudget(fund.code, getCurrentFiscalYearCode());
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(fund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});
