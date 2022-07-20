import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersCard from '../../support/fragments/users/usersCard';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../support/dictionary/devTeams';
import users from '../../support/fragments/users/users';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';

let userWthViewEditPermissions;
let userWithCsvViewPermission;
let userWithInAppViewPermission;
let userWithCsvPermissions;

describe('bulk-edit', () => {
  before('create test users', () => {
    cy.createTempUser([
      permissions.uiUsersEditProfile.gui,
      permissions.uiUsersViewProfile.gui,
      permissions.uiUsersPermissions.gui,
    ])
      .then(userProperties => { userWthViewEditPermissions = userProperties; });

    cy.createTempUser([permissions.bulkEditCsvView.gui])
      .then(userProperties => { userWithCsvViewPermission = userProperties; });

    cy.createTempUser([permissions.bulkEditView.gui])
      .then(userProperties => { userWithInAppViewPermission = userProperties; });

    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
    ]).then(userProperties => { userWithCsvPermissions = userProperties; });
  });

  after('delete test data', () => {
    users.deleteViaApi(userWthViewEditPermissions.userId);
    users.deleteViaApi(userWithCsvViewPermission.userId);
    users.deleteViaApi(userWithInAppViewPermission.userId);
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

  it('C350903 Verify "Bulk Edit: CSV - View" permissions (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWithCsvViewPermission.username, userWithCsvViewPermission.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditSearchPane.verifyCsvViewPermission();
  });

  it('C350936 Verify "Bulk edit: in app - view" permissions (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWithInAppViewPermission.username, userWithInAppViewPermission.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditSearchPane.verifyInAppViewPermission();
  });

  // TODO: think about dragging file without dropping
  it('C353537 Verify label to the Drag and drop area -- CSV approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWithCsvPermissions.username, userWithCsvPermissions.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditActions.openActions();
    BulkEditActions.openStartBulkEditForm();
    BulkEditActions.verifyLabel('Upload CSV file with edited records');
  });
});
