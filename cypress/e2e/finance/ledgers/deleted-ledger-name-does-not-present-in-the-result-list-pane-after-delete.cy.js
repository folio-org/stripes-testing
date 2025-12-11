import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  const testData = {
    fiscalYear: { ...FiscalYears.defaultUiFiscalYear },
    ledger: {},
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
      });
    });

    cy.createTempUser([permissions.uiFinanceViewEditDeleteLedger.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    });
  });

  it(
    'C357524 Deleted ledger name no longer appears in the results list (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357524'] },
    () => {
      Ledgers.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.deleteLedgerViaActions();
      InteractorsTools.checkCalloutMessage('Ledger has been deleted');
      Ledgers.waitForLedgerDetailsLoading();
      Ledgers.searchByName(testData.ledger.name);
      Ledgers.checkZeroSearchResultsHeader();
    },
  );
});
