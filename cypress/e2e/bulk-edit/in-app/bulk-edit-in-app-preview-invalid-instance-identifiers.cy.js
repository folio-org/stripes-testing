import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const invalidInstanceHRIDsFileName = `AT_C423685_InvalidInstanceHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceHRIDsFileName,
);

// Generate up to 10 invalid Instance HRIDs
const invalidInstanceHRIDs = [];
for (let i = 0; i < 10; i++) {
  invalidInstanceHRIDs.push(`hrid${getRandomPostfix()}`);
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(
          `cypress/fixtures/${invalidInstanceHRIDsFileName}`,
          invalidInstanceHRIDs.join('\n'),
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidInstanceHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);
    });

    it(
      'C423685 Verify "Preview of record matched" in case of uploading invalid Instance identifiers (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423685'] },
      () => {
        // Step 1: Select "Inventory - instances" radio button and "Instance HRIDs" identifier
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

        // Step 2: Upload .csv file with up to 10 invalid Instance HRIDs
        BulkEditSearchPane.uploadFile(invalidInstanceHRIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidInstanceHRIDsFileName);

        // Step 3: Check the result of uploading the .csv file with Instance HRIDs
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceHRIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceHRIDsFileName);
        BulkEditSearchPane.verifyErrorLabel(invalidInstanceHRIDs.length);

        invalidInstanceHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyNonMatchedResults(hrid);
        });

        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidInstanceHRIDs.length);

        // Step 4: Check the columns in the error table
        invalidInstanceHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyErrorByIdentifier(hrid, 'No match found', 'Error');
        });

        // Step 5: Click Actions menu
        BulkEditActions.openActions();

        // Verify Actions menu shows only "Download errors (CSV)" option
        BulkEditActions.downloadErrorsExists();

        // Step 6: Download errors CSV file
        BulkEditActions.downloadErrors();
        invalidInstanceHRIDs.forEach((hrid) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${hrid},No match found`,
          ]);
        });
      },
    );
  });
});
