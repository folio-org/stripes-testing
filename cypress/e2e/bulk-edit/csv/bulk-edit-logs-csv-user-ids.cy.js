import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const validUserUUDsFileName = `validUseUUDs_${getRandomPostfix()}.csv`;
const importFileName = `bulkEditImport_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.uiUsersView.gui
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${validUserUUDsFileName}`, user.userId);
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${validUserUUDsFileName}`);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it('C375217 Verify genetated Logs files for Users CSV (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
      BulkEditSearchPane.uploadFile(validUserUUDsFileName);

      // Prepare file for bulk edit
      const newName = `testName_${getRandomPostfix()}`;
      BulkEditActions.downloadMatchedResults();
      BulkEditActions.prepareValidBulkEditFile('Matched-Records', importFileName, 'testPermFirst', newName);

      // Upload bulk edit file
      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(importFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyChangedResults(newName);

      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkUsersCheckbox();

      BulkEditSearchPane.clickActionsOnTheRow();
      BulkEditSearchPane.verifySuccessInLogsRowAction();
      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyMatchedResultFileContent(`*${validUserUUDsFileName}*`, [user.username], 'firstElement', true);

      BulkEditSearchPane.clickActionsOnTheRow();
      BulkEditSearchPane.downloadFileWithTheMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent('*Matched-Records*', [user.username], 'firstElement', true);

      BulkEditSearchPane.clickActionsOnTheRow();
      BulkEditSearchPane.downloadFileWithThePreviewOfProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(importFileName, [user.username], 'firstElement', true);

      BulkEditSearchPane.clickActionsOnTheRow();
      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent('result*', [user.username], 'firstElement', true);
    });
  });
});
