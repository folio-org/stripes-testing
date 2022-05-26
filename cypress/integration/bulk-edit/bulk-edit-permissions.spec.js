import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import UsersCard from '../../support/fragments/users/usersCard';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../support/dictionary/devTeams';

let userWthViewEditPermissions;
let userWithViewPermissions;

describe('ui-users: BULK EDIT permissions', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.uiUsersEditProfile.gui,
      permissions.uiUsersViewProfile.gui,
      permissions.uiUsersPermissions.gui,
    ])
      .then(userProperties => {
        userWthViewEditPermissions = userProperties;
      });

    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
    ])
      .then(userProperties => {
        userWithViewPermissions = userProperties;
      });
  });

  after('Delete all data', () => {
    cy.deleteUser(userWthViewEditPermissions.userId);
    cy.deleteUser(userWithViewPermissions.userId);
  });


  it('C350765 Verify BULK EDIT permissions list', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    const permissionsToVerify = [
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditCsvDelete.gui,
    ];

    cy.login(userWthViewEditPermissions.username, userWthViewEditPermissions.password);
    cy.visit(TopMenu.usersPath);

    UsersSearchPane.searchByKeywords(userWthViewEditPermissions.barcode);
    UsersSearchPane.openUser(userWthViewEditPermissions.userId);
    UsersEditPage.addPermissions(permissionsToVerify);
    UsersEditPage.saveAndClose();
    UsersCard.verifyPermissions(permissionsToVerify);
  });

  it('C350903 Verify "Bulk Edit: CSV - View" permissions', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWithViewPermissions.username, userWithViewPermissions.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditSearchPane.verifyItemsForOnlyViewPermission();
  });
});
