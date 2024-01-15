import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import newFund from '../../../support/fragments/finance/funds/newFund';
import DateTools from '../../../support/utils/dateTools';

describe('ui-finance: Funds', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.getAdminToken();
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C4057 Add budget to a fund (thunderjet)', { tags: ['smoke', 'thunderjet'] }, () => {
    Funds.createFundViaUI(fund).then((createdLedger) => {
      createdLedgerId = createdLedger.id;
      Funds.addBudget(0);
      Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
      Funds.deleteBudgetViaActions();
      Funds.deleteFundViaActions();
      FinanceHelp.searchByName(fund.name);
      Funds.checkZeroSearchResultsHeader();
    });
  });
});
