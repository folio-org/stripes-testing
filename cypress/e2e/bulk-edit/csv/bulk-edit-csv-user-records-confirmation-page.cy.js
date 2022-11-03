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
const matchRecordsFileName = `matchedRecords_${getRandomPostfix()}.csv`;
const importFileName = `bulkEditImport_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.username);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
      FileManager.deleteFile(`cypress/downloads/${matchRecordsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it('C357982 Verify user records - in app permission - confirmation page', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Usernames');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      const changedFirstName = `testedNameChanged_${getRandomPostfix()}`;
      BulkEditActions.downloadMatchedResults(matchRecordsFileName);
      BulkEditActions.prepareValidBulkEditFile(matchRecordsFileName, importFileName, 'testPermFirst', changedFirstName);

      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(importFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyChangedResults(user.username);
      BulkEditSearchPane.verifyChangedResults(changedFirstName);
      BulkEditSearchPane.verifyPaneTitleFileName(importFileName);
      BulkEditSearchPane.verifyUserBarcodesResultAccordion();
      BulkEditActions.openActions();
      BulkEditSearchPane.verifyUsersActionShowColumns();
      BulkEditActions.verifyActionsDownloadChangedCSV();

      BulkEditActions.downloadChangedCSV();

      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
      UsersSearchPane.searchByKeywords(changedFirstName);
      UsersSearchPane.openUser(changedFirstName);
    });
  });
});
