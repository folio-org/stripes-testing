import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const invalidUserUUID = `invalidUserUUID_${uuid()}`;
const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIds_${getRandomPostfix()}.csv`;
const matchedRecordsFile = `*Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          `${user.userId}\r\n${invalidUserUUID}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C397348 Verify CANCEL uploading file with matched Users (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C397348'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.checkForUploading(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditActions.downloadMatchedResults();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFile,
          editedFileName,
          user.firstName,
          newFirstName,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditActions.cancel();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        cy.reload();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditLocalButtonExists();

        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.cancel();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditLocalButtonExists();

        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns('First name', newFirstName);
      },
    );
  });
});
