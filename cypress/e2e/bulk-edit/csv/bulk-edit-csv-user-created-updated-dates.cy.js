import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DateTools from '../../../support/utils/dateTools';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';

let user;
let updatedDate;
let userUUIDsFileName;
let editedFileName;
let matchedRecordsFileName;
let changedRecordsFileName;
let previewOfProposedChangesFileName;
let updatedRecordsFileName;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Csv approach', () => {
      beforeEach('create test data', () => {
        userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
        editedFileName = `edited-records-${getRandomPostfix()}.csv`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userUUIDsFileName);
        previewOfProposedChangesFileName =
          BulkEditFiles.getPreviewOfProposedChangesFileName(userUUIDsFileName);
        updatedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userUUIDsFileName);

        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.wait(3000);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
          cy.getUsers({ limit: 1, query: `"username"="${user.username}"` }).then((users) => {
            updatedDate = users[0].updatedDate;
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          userUUIDsFileName,
          matchedRecordsFileName,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C411714 Verify that "Created date" and "Updated date" fields are system updated in User Bulk edit (Local approach) (firebird)',
        { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C411714'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          const newName = `testName_${getRandomPostfix()}`;
          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.verifyUsersActionShowColumns();
          BulkEditSearchPane.verifyCheckboxesAbsent('Record created', 'Record updated');
          const userColumns = [
            'User name',
            'User id',
            'External system id',
            'Barcode',
            'Active',
            'Type',
            'Patron group',
            'Departments',
            'Proxy for',
            'Last name',
            'First name',
            'Middle name',
            'Preferred first name',
            'Email',
            'Phone',
            'Mobile phone',
            'Addresses',
            'Preferred contact type id',
            'Link to the profile picture',
            'Enrollment date',
            'Expiration date',
            'Tags',
            'Custom fields',
            'Preferred email communications',
          ];
          ExportFile.verifyFileIncludes(matchedRecordsFileName, ['Date of birth', userColumns]);
          ExportFile.verifyFileIncludes(
            matchedRecordsFileName,
            ['Created date', 'Updated date'],
            false,
          );
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFileName,
            editedFileName,
            'testPermFirst',
            newName,
          );

          BulkEditActions.openStartBulkEditForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(newName);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          ExportFile.verifyFileIncludes(changedRecordsFileName, [
            'Date Of Birth',
            userColumns,
            newName,
          ]);
          ExportFile.verifyFileIncludes(
            changedRecordsFileName,
            ['Created date', 'Updated date'],
            false,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();

          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(userUUIDsFileName, [user.userId]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, ['Date of birth', userColumns]);

          BulkEditLogs.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [
            'Date of birth',
            userColumns,
            newName,
          ]);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            'Date Of Birth',
            userColumns,
            newName,
          ]);

          cy.getUsers({ limit: 1, query: `"username"="${user.username}"` }).then((users) => {
            cy.expect(users[0].updatedDate).to.include(today);
            cy.expect(users[0].updatedDate).to.not.eq(updatedDate);
          });
        },
      );
    });
  },
);
