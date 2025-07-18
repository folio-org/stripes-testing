import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import DateTools from '../../../../support/utils/dateTools';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
let validUserBarcodesFileName;
let fileNames;
const afterThreeMonthsDate = DateTools.getAfterThreeMonthsDateObj();
const newExpirationDate = {
  date: afterThreeMonthsDate,
  dateWithSlashes: DateTools.getFormattedDateWithSlashes({ date: afterThreeMonthsDate }),
  dateWithDashes: DateTools.getFormattedDate({ date: afterThreeMonthsDate }),
};

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Logs', () => {
      describe('In-app approach', () => {
        beforeEach('create test data', () => {
          validUserBarcodesFileName = `validUserBarcodes_${getRandomPostfix()}.csv`;
          fileNames = BulkEditFiles.getAllDownloadedFileNames(validUserBarcodesFileName, true);

          cy.createTempUser([
            permissions.bulkEditLogsView.gui,
            permissions.bulkEditUpdateRecords.gui,
            permissions.uiUserEdit.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            FileManager.createFile(`cypress/fixtures/${validUserBarcodesFileName}`, user.barcode);
          });
        });

        afterEach('delete test data', () => {
          cy.getAdminToken();
          FileManager.deleteFile(`cypress/fixtures/${validUserBarcodesFileName}`);
          FileManager.deleteFileFromDownloadsByMask(validUserBarcodesFileName);
          Users.deleteViaApi(user.userId);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });

        it(
          'C375244 Verify generated Logs files for Users In app -- only valid (firebird)',
          { tags: ['smoke', 'firebird', 'C375244'] },
          () => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
            BulkEditSearchPane.uploadFile(validUserBarcodesFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.downloadMatchedResults();

            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditActions.verifyBulkEditForm();
            BulkEditActions.fillExpirationDate(newExpirationDate.date);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.fillPatronGroup('graduate (Graduate Student)', 1);
            BulkEditActions.confirmChanges();
            BulkEditActions.downloadPreview();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkUsersCheckbox();
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenCompleted();

            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(validUserBarcodesFileName, [user.barcode]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.matchedRecordsCSV,
              [user.barcode],
              'userBarcode',
              true,
            );

            BulkEditLogs.downloadFileWithProposedChanges();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.previewRecordsCSV,
              ['graduate'],
              'patronGroup',
              true,
            );
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.previewRecordsCSV,
              [newExpirationDate.dateWithDashes],
              'expirationDate',
              true,
            );

            BulkEditLogs.downloadFileWithUpdatedRecords();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.changedRecordsCSV,
              ['graduate'],
              'patronGroup',
              true,
            );
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.changedRecordsCSV,
              [newExpirationDate.dateWithDashes],
              'expirationDate',
              true,
            );

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
            UsersSearchPane.searchByUsername(user.username);
            Users.verifyPatronGroupOnUserDetailsPane('graduate');
            Users.verifyExpirationDateOnUserDetailsPane(newExpirationDate.dateWithSlashes);
          },
        );
      });
    });
  },
);
