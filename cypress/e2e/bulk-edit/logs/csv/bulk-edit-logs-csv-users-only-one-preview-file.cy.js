import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
let userToEdit;
const newFirstName = `testNewFirstName_${getRandomPostfix()}`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileNameMask = `*-Updates-Preview-CSV-${userUUIDsFileName}`;
const changedRecordsFileNameMask = `*-Changed-Records*-${userUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('Csv approach', () => {
      before('create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          userToEdit = userProperties;

          cy.createTempUser([
            permissions.uiUserEdit.gui,
            permissions.bulkEditCsvEdit.gui,
            permissions.bulkEditLogsView.gui,
          ]).then((adminProperties) => {
            user = adminProperties;

            FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${userToEdit.userId}`);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(userToEdit.userId);
        FileManager.deleteFileFromDownloadsByMask(
          userUUIDsFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileNameMask,
          changedRecordsFileNameMask,
        );
      });

      it(
        'C422005 Only one file with the preview of proposed changes is downloaded from Logs (firebird)',
        { tags: ['extendedPath', 'firebird', 'C422005'] },
        () => {
          // Step 1-3: Open Bulk edit, select Users => User UUIDs, upload UUIDs file.
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 4: Download matched records (CSV).
          BulkEditActions.downloadMatchedResults();

          // Step 5: Edit at least one record in the matched records file and save with new name.
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFileName,
            editedFileName,
            userToEdit.firstName,
            newFirstName,
          );

          // Step 6-7: Start bulk edit (Local) with edited file and complete it.
          BulkEditActions.openStartBulkEditLocalForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(newFirstName);

          // Step 8: Open Logs, filter by Users, download "File with the preview of proposed changes (CSV)".
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.scrollLogsTableTo('right');
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.downloadFileWithProposedChanges();

          // Verify exactly one preview-of-proposed-changes file is downloaded
          // and its name follows the pattern: <yyyy-mm-dd>-Updates-Preview-CSV-<identifiers file name>.csv
          cy.wait(Cypress.env('downloadTimeout'));
          FileManager.findDownloadedFilesByMask(previewOfProposedChangesFileNameMask).then(
            (downloadedFilenames) => {
              expect(
                downloadedFilenames,
                'Exactly one preview-of-proposed-changes file should be downloaded',
              ).to.have.lengthOf(1);
            },
          );

          // Verify the downloaded preview file actually reflects the proposed change.
          BulkEditFiles.verifyValueInRowByUUID(
            previewOfProposedChangesFileNameMask,
            'User id',
            userToEdit.userId,
            'First name',
            newFirstName,
          );
        },
      );
    });
  });
});
