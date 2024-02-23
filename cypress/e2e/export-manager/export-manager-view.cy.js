import permissions from '../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';

let user;

describe('Export Manager', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.exportManagerView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.exportManagerPath,
        waiter: ExportManagerSearchPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C405555 Verify that User is able to see the executed jobs but not to download the files with View permissions (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.searchByAuthorityControl();
      ExportManagerSearchPane.searchByBursar();
      ExportManagerSearchPane.searchByCirculationLog();
      ExportManagerSearchPane.searchByEHoldings();
      ExportManagerSearchPane.searchByBulkEdit();
      ExportManagerSearchPane.searchByEdifactOrders();
      ExportManagerSearchPane.searchBySuccessful();
      ExportManagerSearchPane.selectSearchResultItem();
      ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();

      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.searchBySuccessful();
      ExportManagerSearchPane.searchByInProgress();
      ExportManagerSearchPane.searchByScheduled();
      ExportManagerSearchPane.searchByFailed();

      ExportManagerSearchPane.searchByInProgress();
      ExportManagerSearchPane.searchByScheduled();
      ExportManagerSearchPane.searchByFailed();
      ExportManagerSearchPane.selectSearchResultItem();
      ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
      ExportDetails.verifyJobLabels();
    },
  );
});
