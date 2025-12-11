import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  const testData = {
    fiscalYear: { ...FiscalYears.defaultUiFiscalYear },
    ledger: {},
    fund: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(testData.fiscalYear).then((fyResponse) => {
      testData.fiscalYear.id = fyResponse.id;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fyResponse.id,
      };
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          cy.createTempUser([permissions.uiFinanceViewEditDeleteFundBudget.gui]).then(
            (userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.fundPath,
                waiter: Funds.waitLoading,
              });
            },
          );
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C357527 Deleted fund name does not appear in the result list after deletion (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357527'] },
    () => {
      Funds.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      Funds.deleteFundViaActions();
      InteractorsTools.checkCalloutMessage('Fund has been deleted');
      Funds.waitLoading();
      Funds.searchByName(testData.fund.name);
      Funds.checkZeroSearchResultsHeader();
    },
  );
});
