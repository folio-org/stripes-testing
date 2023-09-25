import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DevTeams from '../../support/dictionary/devTeams';
import TestTypes from '../../support/dictionary/testTypes';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';

let user;

describe('data-export', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiUsersPermissions.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C389473 Verify that "Settings (Data export): display list of settings pages" permission is searchable and renamed (firebird) (Taas)',
    { tags: [DevTeams.firebird, TestTypes.extendedPath] },
    () => {
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyUserDetailsPane();
      Users.editButton();
      UserEdit.verifyUserPermissionsAccordion();
      UserEdit.openSelectPermissions();
      UserEdit.searchForPermission('Settings (Data export): display list of settings pages');
      UserEdit.verifyPermissionsFiltered([
        'Settings (Data export): display list of settings pages',
      ]);
      UserEdit.resetAll();
      UserEdit.searchForPermission('Data export');
      UserEdit.verifyPermissionsFiltered([
        'Settings (Data export): display list of settings pages',
        'UI: Data export module is enabled',
      ]);
    },
  );
});
