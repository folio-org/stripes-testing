import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import devTeams from '../../../support/dictionary/devTeams';
import users from '../../../support/fragments/users/users';

let userWthViewEditPermissions;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.uiUsersEditProfile.gui,
        permissions.uiUsersViewProfile.gui,
        permissions.uiUsersPermissions.gui,
      ])
        .then(userProperties => { userWthViewEditPermissions = userProperties; });
    });

    after('delete test data', () => {
      users.deleteViaApi(userWthViewEditPermissions.userId);
    });

    it('C350765 Verify BULK EDIT permissions list (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      const permissionsToVerify = [
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvDelete.gui,
      ];

      cy.login(userWthViewEditPermissions.username, userWthViewEditPermissions.password);
      cy.visit(TopMenu.usersPath);

      UsersSearchPane.searchByKeywords(userWthViewEditPermissions.barcode);
      UsersSearchPane.openUser(userWthViewEditPermissions.userId);
      UserEdit.addPermissions(permissionsToVerify);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions(permissionsToVerify);
    });
  })
});
