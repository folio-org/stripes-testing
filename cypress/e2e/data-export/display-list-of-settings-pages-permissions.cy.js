import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';
import dataExportPermission from '../../support/fragments/data-export/data-export-permission';

let user;

describe('Data-export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.uiUsersView.gui, permissions.uiUsersPermissions.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.dataExportPath);
      },
    );
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C389473 Verify that "Settings (Data export): display list of settings pages" permission is searchable and renamed',
    { tags: [devTeams.firebird] },
    () => {
      dataExportPermission.openUsersMenu();
      dataExportPermission.selectActiveStatus();
      dataExportPermission.openUsersProfile();
      dataExportPermission.verifyUserDetailsPane();
      dataExportPermission.goToEditPage();
      dataExportPermission.verifyUserPermissionsAccordion();
      dataExportPermission.openSelectPermissions();
      dataExportPermission.searchForPermission(
        'Settings (Data export): display list of settings pages',
      );
      dataExportPermission.verifyPermissionsFiltered([
        'Settings (Data export): display list of settings pages',
      ]);
      dataExportPermission.resetAll();
      dataExportPermission.searchForPermission('Data export');
      dataExportPermission.verifyPermissionsFiltered([
        'Settings (Data export): display list of settings pages',
        'UI: Data export module is enabled',
      ]);
    },
  );
});
