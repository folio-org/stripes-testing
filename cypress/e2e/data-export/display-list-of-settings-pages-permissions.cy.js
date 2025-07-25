import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

let user;

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiUserCanAssignUnassignPermissions.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C692239 Verify that "Settings (Data export): Can view only" permission is searchable and renamed (firebird) (Taas)',
    { tags: ['firebird', 'extendedPath', 'C692239'] },
    () => {
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyUserDetailsPane();
      UserEdit.openEdit();
      UserEdit.verifyUserPermissionsAccordion();
      UserEdit.openSelectPermissionsModal();
      UserEdit.searchForPermission(Permissions.dataExportSettingsViewOnly.gui);
      UserEdit.verifyPermissionsFiltered([Permissions.dataExportSettingsViewOnly.gui]);
      UserEdit.resetAll();
      UserEdit.searchForPermission('Data export');
      cy.wait(500);
      UserEdit.verifyPermissionsFiltered([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewOnly.gui,
        Permissions.dataExportSettingsViewOnly.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]);
    },
  );
});
