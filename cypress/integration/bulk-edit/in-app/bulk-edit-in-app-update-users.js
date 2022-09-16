import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchRecordsFileName = `matchedRecords_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/downloads/${matchRecordsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it('C357579 Bulk edit: In app - Update user records permission enabled - Preview of records matched (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults(matchRecordsFileName);

      BulkEditActions.openStartBulkEditForm();
      BulkEditActions.verifyBulkEditForm();
    });

    it.only('C357578 Verify "In app - Update user records" permission (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.verifyUsersUpdatePermission();
      BulkEditSearchPane.verifyRecordIdentifierItems();
      BulkEditSearchPane.verifyDragNDropUpdateUsersArea();

      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
      BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();

      BulkEditSearchPane.selectRecordIdentifier('External IDs');
      BulkEditSearchPane.verifyDragNDropExternalIDsArea();

      BulkEditSearchPane.selectRecordIdentifier('Usernames');
      BulkEditSearchPane.verifyDragNDropUsernamesArea();
    });
  });
});
