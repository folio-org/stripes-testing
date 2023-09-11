import getRandomPostfix from '../../../support/utils/stringTools';
import Funds from '../../../support/fragments/finance/funds/funds';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import newFund from '../../../support/fragments/finance/funds/newFund';
import devTeams from '../../../support/dictionary/devTeams';

describe('ui-finance: Funds', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it(
    'C4052 Create a new fund (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      Funds.createFundViaUI(fund).then((createdLedger) => {
        createdLedgerId = createdLedger.id;
        Funds.deleteFundViaActions();
        // should not create fund without mandatory fields
        const testFundName = `autotest_fund_${getRandomPostfix()}`;
        Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
        FinanceHelp.searchByName(testFundName);
        Funds.checkZeroSearchResultsHeader();
      });
    },
  );
});
