import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import users from '../../../support/fragments/users/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let userWthViewEditPermissions;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserCanAssignUnassignPermissions.gui,
      ]).then((userProperties) => {
        userWthViewEditPermissions = userProperties;
        cy.login(userWthViewEditPermissions.username, userWthViewEditPermissions.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      users.deleteViaApi(userWthViewEditPermissions.userId);
    });

    it(
      'C663361 Verify BULK EDIT permissions list (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C663361'] },
      () => {
        const permissionsToVerify = [
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditUpdateRecords.gui,
        ];
        const csvDeletePermission = permissions.bulkEditCsvDelete.gui;

        UsersSearchPane.searchByKeywords(userWthViewEditPermissions.barcode);
        UsersSearchPane.openUser(userWthViewEditPermissions.userId);
        UserEdit.addPermissions(permissionsToVerify);
        UserEdit.openSelectPermissionsModal();
        UserEdit.verifyPermissionDoesNotExistInSelectPermissions(csvDeletePermission);
        UserEdit.cancelSelectPermissionsModal();
        UserEdit.saveAndClose();
        UsersCard.verifyPermissions(permissionsToVerify);
      },
    );
  });
});
