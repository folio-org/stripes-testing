import getRandomPostfix from '../../../support/utils/stringTools';
import Funds from '../../../support/fragments/finance/funds/funds';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import newFund from '../../../support/fragments/finance/funds/newFund';

describe('ui-finance: Fund creation', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C4052 Create a new fund', { tags: [testType.smoke] }, () => {
    Funds.createFundViaUI(fund)
      .then(
        createdLedger => {
          createdLedgerId = createdLedger.id;
          Funds.deleteFundViaActions();
          // should not create fund without mandatory fields
          const testFundName = `autotest_fund_${getRandomPostfix()}`;
          Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
          FinanceHelp.searchByName(testFundName);
          Funds.checkZeroSearchResultsHeader();
        }
      );
  });
});
