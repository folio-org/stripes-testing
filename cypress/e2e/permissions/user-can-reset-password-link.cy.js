import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import Permissions from '../../support/dictionary/permissions';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';
import { including } from '../../../interactors';
import TopMenu from '../../support/fragments/topMenu';

describe('Permissions', () => {
  describe('Permissions --> Users', () => {
    const resetLinkPart = '/reset-password';
    const originalPermissions = [Permissions.inventoryAll.gui];
    const updatedPermissions = [
      Permissions.uiUsersView.gui,
      Permissions.uiUserEdit.gui,
      Permissions.uiUsersCreateResetPassword.gui,
    ];
    let testUser;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser(originalPermissions).then((createdUserProperties) => {
        testUser = createdUserProperties;
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
    });

    it(
      'C1223 Users: Can send create/reset password link (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1223'] },
      () => {
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.INVENTORY);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.USERS, false);

        cy.getAdminToken();
        cy.assignPermissionsToExistingUser(testUser.userId, updatedPermissions);

        cy.login(testUser.username, testUser.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
          authRefresh: true,
        });
        UsersSearchPane.searchByUsername(testUser.username);
        UsersSearchPane.selectUserFromList(testUser.username);
        UserEdit.openEdit();
        UserEdit.clickResetPasswordLink();
        UserEdit.verifyResetLink(including(resetLinkPart));
      },
    );
  });
});
