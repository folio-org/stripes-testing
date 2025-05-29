import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.wait(3000);

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.username);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353964 Verify uploading file with Usernames (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C353964'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('Usernames');

        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');

        BulkEditActions.downloadMatchedResults();
        const newUserName = `testName_${getRandomPostfix()}`;
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          user.username,
          newUserName,
        );

        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyChangedResults(newUserName);
      },
    );
  });
});
