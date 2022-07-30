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
const invalidUserUUID = getRandomPostfix();
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
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}\r\n${invalidUserUUID}`);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${importFileName}`);
      FileManager.deleteFile(`cypress/downloads/${matchRecordsFileName}`);
      Users.deleteViaApi(user.userId);
    });


    it('C350928 Verify error accordion during matching (CSV approach) (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyMatchedResults(user.username);
      BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

      BulkEditSearchPane.verifyActionsAfterConductedCSVUploading();
      BulkEditSearchPane.verifyUsersActionShowColumns();

      BulkEditSearchPane.changeShowColumnCheckbox('Email');
      BulkEditSearchPane.verifyResultColumTitles('Email');

      BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
      BulkEditActions.newBulkEdit();
    });

    it('C353233 Verify number of updated records (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      // Upload file
      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      // Prepare file for bulk edit
      BulkEditActions.downloadMatchedResults(matchRecordsFileName);
      BulkEditActions.prepareBulkEditFileWithDuplicates(matchRecordsFileName, importFileName, user.username, 'test');

      // Upload bulk edit file
      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(importFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      // Verify changes
      BulkEditSearchPane.verifyChangedResults(user.username);
      BulkEditSearchPane.verifyErrorLabelAfterChanges(userUUIDsFileName, 1, 1);
      BulkEditActions.newBulkEdit();
    });

    it('C357034 Verify elements of the bulk edit app -- CSV app (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.clickToBulkEditMainButton();
      BulkEditSearchPane.verifyDefaultFilterState();

      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyMatchedResults(user.username);
      BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

      BulkEditSearchPane.clickToBulkEditMainButton();
      BulkEditSearchPane.verifyDefaultFilterState();
    });

    it('C356817 Verify Matched records label cleanup -- CSV approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyMatchedResults(user.username);
      BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);
      BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
      BulkEditSearchPane.verifyPaneRecordsCount(1);

      BulkEditActions.downloadMatchedResults(matchRecordsFileName);
      BulkEditActions.prepareBulkEditFileWithDuplicates(matchRecordsFileName, importFileName, user.username, 'test');

      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(importFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyChangedResults(user.username);
      BulkEditSearchPane.verifyErrorLabelAfterChanges(userUUIDsFileName, 1, 1);
      BulkEditActions.newBulkEdit();
    });
  })
});
