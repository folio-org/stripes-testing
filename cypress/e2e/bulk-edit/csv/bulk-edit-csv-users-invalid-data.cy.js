import { Permissions } from '../../../support/dictionary';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import FileManager from '../../../support/utils/fileManager';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
let secondUser;
const editedFirstName = `editedFirstName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(userUUIDsFileName, true);
const invalidStatus = getRandomPostfix();
const errorMessage = `Field "active" : Invalid boolean value: ${invalidStatus}`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createTempUser([]).then((secondUserProperties) => {
          secondUser = secondUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(
            `cypress/fixtures/${userUUIDsFileName}`,
            `${user.userId}\n${secondUser.userId}`,
          );
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(secondUser.userId);
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });
    });

    it(
      'C353943 Negative: Verify Local updating records with invalid data (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C353943'] },
      () => {
        // Upload user UUIDs and download matched records
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username, secondUser.username);
        BulkEditActions.downloadMatchedResults();

        // Prepare file with both valid and invalid changes
        FileManager.findDownloadedFilesByMask(`*${fileNames.matchedRecordsCSV}*`).then(
          (downloadedFilenames) => {
            const lastDownloadedFilename =
              downloadedFilenames.sort()[downloadedFilenames.length - 1];
            FileManager.readFile(lastDownloadedFilename).then((actualContent) => {
              const content = actualContent.split('\n');

              // Find the row index for each user by UUID
              const firstUserRowIndex = content.findIndex((row) => row.includes(user.userId));
              const secondUserRowIndex = content.findIndex((row) => {
                return row.includes(secondUser.userId);
              });

              // Replace first user's firstName with edited firstName (valid change)
              content[firstUserRowIndex] = content[firstUserRowIndex].replace(
                user.firstName,
                editedFirstName,
              );
              // Replace "true" with invalid status for second user (invalid change)
              content[secondUserRowIndex] = content[secondUserRowIndex].replace(
                'true',
                invalidStatus,
              );

              FileManager.createFile(`cypress/fixtures/${editedFileName}`, content.join('\n'));
            });
          },
        );

        BulkEditActions.openStartBulkEditLocalForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();

        // Commit changes - first user should succeed, second user should fail
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        // Verify error appears only for second user with invalid status
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyErrorByIdentifier(secondUser.userId, errorMessage);

        // Verify first user was updated successfully
        BulkEditSearchPane.verifyChangedResults(editedFirstName);

        // Download and verify changed CSV file
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          user.userId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.FIRST_NAME,
          editedFirstName,
        );

        // Download errors file and verify only second user's error
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${secondUser.userId},${errorMessage}`,
        ]);
        BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);
      },
    );
  });
});
