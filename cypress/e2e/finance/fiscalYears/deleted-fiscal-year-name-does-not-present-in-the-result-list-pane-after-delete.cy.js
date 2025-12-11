import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  let user;

  before('Create test data', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((response) => {
      fiscalYear.id = response.id;
    });

    cy.createTempUser([permissions.uiFinanceViewEditDeleteFiscalYear.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C357525 Deleted fiscal year name does not present in the result list pane after delete (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357525'] },
    () => {
      FiscalYears.searchByName(fiscalYear.name);
      FiscalYears.selectFisacalYear(fiscalYear.name);
      FiscalYears.deleteFiscalYearViaActions();
      InteractorsTools.checkCalloutMessage('Fiscal year has been deleted');
      FiscalYears.waitLoading();
      FiscalYears.searchByName(fiscalYear.name);
      FiscalYears.checkZeroSearchResultsHeader();
    },
  );
});
