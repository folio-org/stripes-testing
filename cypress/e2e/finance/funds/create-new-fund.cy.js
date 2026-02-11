import { APPLICATION_NAMES } from '../../../support/constants';
import { FinanceHelper, FiscalYears, Funds, Ledgers } from '../../../support/fragments/finance';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Funds', () => {
  const testData = {
    fiscalYear: { ...FiscalYears.defaultUiFiscalYear },
    ledger: { ...Ledgers.getDefaultLedger() },
    fund: { ...NewFund.defaultFund },
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(testData.fiscalYear).then((fyResponse) => {
      testData.fiscalYear.id = fyResponse.id;
      testData.ledger.fiscalYearOneId = testData.fiscalYear.id;

      Ledgers.createViaApi(testData.ledger).then((ledgerResponse) => {
        testData.ledger.id = ledgerResponse.id;
        testData.fund.ledgerName = ledgerResponse.name;
        testData.fund.ledgerId = testData.ledger.id;
      });
    });

    cy.loginAsAdmin();
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Funds.getFundsViaApi({ query: `code="${testData.fund.code}"` }).then((body) => {
      Funds.deleteFundViaApi(body.funds[0].id);
    });
    cy.deleteLedgerApi(testData.ledger.id);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
  });

  it(
    'C4052 Create a new fund (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C4052', 'shiftLeft'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
      FinanceHelper.clickFundButton();
      Funds.createFund(testData.fund);
      InteractorsTools.checkCalloutMessage('Fund has been saved');
      Funds.checkCreatedFund(testData.fund.name);

      // should not create fund without mandatory fields
      const testFundName = `autotest_fund_${getRandomPostfix()}`;
      Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
      FinanceHelper.searchByName(testFundName);
      Funds.checkZeroSearchResultsHeader();
    },
  );
});
