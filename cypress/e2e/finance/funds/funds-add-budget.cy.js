import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import NewFund from '../../../support/fragments/finance/funds/newFund';

describe('Funds', () => {
  const fund = { ...NewFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.getAdminToken();
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C4057 Add budget to a fund (thunderjet)', { tags: ['smoke', 'thunderjet', 'C4057'] }, () => {
    Funds.createFundViaApiAndUi(fund).then((createdLedger) => {
      createdLedgerId = createdLedger.id;
      Funds.addBudget(0);
      Funds.deleteBudgetViaActions();
      Funds.deleteFundViaActions();
      FinanceHelp.searchByName(fund.name);
      Funds.checkZeroSearchResultsHeader();
    });
  });
});
