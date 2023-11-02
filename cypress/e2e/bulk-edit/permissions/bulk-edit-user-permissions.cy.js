import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import devTeams from '../../../support/dictionary/devTeams';
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
        permissions.uiUsersPermissions.gui,
      ]).then((userProperties) => {
        userWthViewEditPermissions = userProperties;
      });
    });

    after('delete test data', () => {
      users.deleteViaApi(userWthViewEditPermissions.userId);
    });

    it(
      'C350765 Verify BULK EDIT permissions list (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        const permissionsToVerify = [
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditUpdateRecords.gui,
        ];
        const csvDeletePermission = permissions.bulkEditCsvDelete.gui;

        cy.login(userWthViewEditPermissions.username, userWthViewEditPermissions.password);
        cy.visit(TopMenu.usersPath);

        UsersSearchPane.searchByKeywords(userWthViewEditPermissions.barcode);
        UsersSearchPane.openUser(userWthViewEditPermissions.userId);
        UserEdit.addPermissions(permissionsToVerify);
        UserEdit.verifyPermissionDoesNotExist(csvDeletePermission);
        UserEdit.saveAndClose();
        UsersCard.verifyPermissions(permissionsToVerify);
      },
    );
  });
});
