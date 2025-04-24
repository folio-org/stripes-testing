import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import newFund from '../../../support/fragments/finance/funds/newFund';

describe('ui-finance: Funds', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.getAdminToken();
    cy.deleteLedgerApi(createdLedgerId);
  });

  it(
    'C4057 Add budget to a fund (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'eurekaPhase1', 'shiftLeft'] },
    () => {
      Funds.createFundViaUI(fund).then((createdLedger) => {
        createdLedgerId = createdLedger.id;
        Funds.addBudget(0);
        Funds.deleteBudgetViaActions();
        Funds.deleteFundViaActions();
        FinanceHelp.searchByName(fund.name);
        Funds.checkZeroSearchResultsHeader();
      });
    },
  );
});
