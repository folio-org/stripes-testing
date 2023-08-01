import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ], 'staff')
        .then(userProperties => {
          user = userProperties;
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });

          cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
            cy.updateUser({ ...users[0], departments: null, personal: { ...users[0].personal, addresses : null } });
          });
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it('C380589 Verify bulk edit of User record that contains NULL values in reference data - In app (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.verifySuccessBanner(1);
      BulkEditSearchPane.verifyChangedResults(user.username);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByUsername(user.username);
      Users.verifyPatronGroupOnUserDetailsPane('graduate');
    });
  });
});
