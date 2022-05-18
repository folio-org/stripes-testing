import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersEditPage from '../../support/fragments/users/usersEditPage';
import UsersCard from '../../support/fragments/users/usersCard';

let user;

describe('ui-users: BULK EDIT permissions', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.uiUsersEditProfile.gui,
      permissions.uiUsersViewProfile.gui,
      permissions.uiUsersPermissions.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(TopMenu.usersPath);
      });
  });

  after('Delete all data', () => {
    cy.deleteUser(user.userId);
  });


  it('C350765 Verify BULK EDIT permissions list', { tags: [testTypes.smoke] }, () => {
    const permissionsToVerify = [
      'Bulk Edit: (CSV) Edit',
      'Bulk Edit: (CSV) View',
      'Bulk Edit: (CSV) Delete'
    ];

    UsersSearchPane.searchByKeywords(user.barcode);
    UsersSearchPane.openUser(user.userId);
    UsersEditPage.addPermissions(permissionsToVerify);
    UsersEditPage.saveAndClose();
    UsersCard.verifyPermissions(permissionsToVerify);
  });
});
