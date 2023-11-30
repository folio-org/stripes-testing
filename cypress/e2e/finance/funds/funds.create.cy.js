import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import newFund from '../../../support/fragments/finance/funds/newFund';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('ui-finance: Funds', () => {
  const fund = { ...newFund.defaultFund };
  let createdLedgerId;

  afterEach(() => {
    cy.getAdminToken();
    cy.deleteLedgerApi(createdLedgerId);
  });

  it('C4052 Create a new fund (thunderjet)', { tags: ['smoke', 'thunderjet'] }, () => {
    Funds.createFundViaUI(fund).then((createdLedger) => {
      createdLedgerId = createdLedger.id;
      Funds.deleteFundViaActions();
      // should not create fund without mandatory fields
      const testFundName = `autotest_fund_${getRandomPostfix()}`;
      Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
      FinanceHelp.searchByName(testFundName);
      Funds.checkZeroSearchResultsHeader();
    });
  });
});
