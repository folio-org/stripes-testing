import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const invalidInstanceHRIDsFileName = `AT_C423685_InvalidInstanceHRIDs_${getRandomPostfix()}.csv`;
const invalidInstanceUUIDsFileName = `AT_C423685_InvalidInstanceUUIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingHRIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceHRIDsFileName,
);
const errorsFromMatchingUUIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidInstanceUUIDsFileName,
);

// Generate up to 10 invalid Instance HRIDs with at least one duplicate
const invalidInstanceHRIDs = [];
for (let i = 0; i < 9; i++) {
  invalidInstanceHRIDs.push(`hrid${getRandomPostfix()}`);
}
// Add a duplicate HRID
invalidInstanceHRIDs.push(invalidInstanceHRIDs[0]);

// Generate up to 10 invalid Instance UUIDs with at least one duplicate
const invalidInstanceUUIDs = [];
for (let i = 0; i < 9; i++) {
  invalidInstanceUUIDs.push(uuid());
}
// Add a duplicate UUID
invalidInstanceUUIDs.push(invalidInstanceUUIDs[0]);

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

        FileManager.createFile(
          `cypress/fixtures/${invalidInstanceUUIDsFileName}`,
          invalidInstanceUUIDs.join('\n'),
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
      FileManager.deleteFile(`cypress/fixtures/${invalidInstanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingHRIDsFileName);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingUUIDsFileName);
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
        // Expect 9 unique errors + 1 duplicate warning
        BulkEditSearchPane.verifyErrorLabel(9, 1);

        // Verify unique invalid HRIDs appear in error table
        const uniqueHRIDs = [...new Set(invalidInstanceHRIDs)];
        uniqueHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyNonMatchedResults(hrid);
        });

        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(10);

        // Step 4: Check the columns in the error table - verify errors and warnings
        uniqueHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyErrorByIdentifier(hrid, ERROR_MESSAGES.NO_MATCH_FOUND, 'Error');
        });

        // Verify duplicate warning
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidInstanceHRIDs[0],
          ERROR_MESSAGES.DUPLICATE_ENTRY,
          'Warning',
        );

        // Step 5: Click Actions menu
        BulkEditActions.openActions();

        // Verify Actions menu shows only "Download errors (CSV)" option
        BulkEditActions.downloadErrorsExists();

        // Step 6: Download errors CSV file
        BulkEditActions.downloadErrors();
        uniqueHRIDs.forEach((hrid) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
            `ERROR,${hrid},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
          ]);
        });
        // Verify duplicate warning in CSV
        ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
          `WARNING,${invalidInstanceHRIDs[0]},${ERROR_MESSAGES.DUPLICATE_ENTRY}`,
        ]);

        // Step 7: Test with Instance UUIDs
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        BulkEditSearchPane.uploadFile(invalidInstanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidInstanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyPaneTitleFileName(invalidInstanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(invalidInstanceUUIDsFileName);
        // Expect 9 unique errors + 1 duplicate warning
        BulkEditSearchPane.verifyErrorLabel(9, 1);

        // Verify unique invalid UUIDs appear in error table
        const uniqueUUIDs = [...new Set(invalidInstanceUUIDs)];
        uniqueUUIDs.forEach((uniqueUuid) => {
          BulkEditSearchPane.verifyNonMatchedResults(uniqueUuid);
        });
        BulkEditSearchPane.clickShowWarningsCheckbox();

        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(10);

        // Step 8: Check the columns in the error table - verify errors and warnings
        uniqueUUIDs.forEach((uniqueUuid) => {
          BulkEditSearchPane.verifyErrorByIdentifier(
            uniqueUuid,
            ERROR_MESSAGES.NO_MATCH_FOUND,
            'Error',
          );
        });

        // Verify duplicate warning
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidInstanceUUIDs[0],
          ERROR_MESSAGES.DUPLICATE_ENTRY,
          'Warning',
        );

        // Step 9: Download errors CSV file for UUIDs
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        uniqueUUIDs.forEach((uniqueUuid) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
            `ERROR,${uniqueUuid},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
          ]);
        });
        // Verify duplicate warning in CSV
        ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
          `WARNING,${invalidInstanceUUIDs[0]},${ERROR_MESSAGES.DUPLICATE_ENTRY}`,
        ]);
      },
    );
  });
});
