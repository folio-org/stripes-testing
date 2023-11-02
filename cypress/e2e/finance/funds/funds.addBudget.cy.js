import newFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('ui-finance: Funds', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it(
    'C4057 Add budget to a fund (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      Funds.createFundViaUI(fund).then((createdLedger) => {
        createdLedgerId = createdLedger.id;
        Funds.addBudget(0);
        Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
        Funds.deleteBudgetViaActions();
        Funds.deleteFundViaActions();
        FinanceHelp.searchByName(fund.name);
        Funds.checkZeroSearchResultsHeader();
      });
    },
  );
});
