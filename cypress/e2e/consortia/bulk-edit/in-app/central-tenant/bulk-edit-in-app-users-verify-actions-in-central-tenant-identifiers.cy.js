import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import DateTools from '../../../../../support/utils/dateTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import UsersCard from '../../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../../support/fragments/users/usersSearchPane';

let user;
let patronUserInCollege;
let staffUserInCollege;
const userPermissions = [
  permissions.bulkEditUpdateRecords.gui,
  permissions.bulkEditCsvEdit.gui,
  permissions.uiUserEdit.gui,
  permissions.bulkEditLogsView.gui,
];
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const errorReason = 'No match found';
const fileNames = BulkEditFiles.getAllDownloadedFileNames(userUUIDsFileName, true);
const newExpirationDate = new Date();
const newExpirationDateWithSlashes = DateTools.getFormattedDateWithSlashes({
  date: new Date(),
});
const newExpirationDateInFile = `${DateTools.getFormattedDate({ date: newExpirationDate })} 23:59:59.000Z`;
const newPatronGroup = 'faculty';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProps) => {
          user = userProps;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);

          cy.withinTenant(Affiliations.College, () => {
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);
            cy.createTempUser([], 'faculty', 'patron', true).then((patronUserProps) => {
              patronUserInCollege = patronUserProps;
            });
            cy.createTempUser([], 'faculty', 'staff', true).then((staffUserProps) => {
              staffUserInCollege = staffUserProps;
            });
          }).then(() => {
            FileManager.createFile(
              `cypress/fixtures/${userUUIDsFileName}`,
              `${patronUserInCollege.userId}\n${staffUserInCollege.userId}\n${user.userId}`,
            );
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          Users.deleteViaApi(patronUserInCollege.userId);
          Users.deleteViaApi(staffUserInCollege.userId);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(userUUIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566178 Verify bulk edit actions for Users in Member tenant - Identifier (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566178'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
          BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 user');
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyNonMatchedResults(user.userId);
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, false);
          BulkEditActions.startBulkEditLocalAbsent();
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const usersToEdit = [patronUserInCollege, staffUserInCollege];

          usersToEdit.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.userId,
              'User name',
              testUser.username,
            );
          });

          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
            [`ERROR,${user.userId},${errorReason}`],
          ]);
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          const oldEmail = user.personal.email;
          const newEmail = 'new_email@google.com';

          BulkEditActions.replaceEmail(oldEmail, newEmail);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.fillExpirationDate(newExpirationDate, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.fillPatronGroup('faculty (Faculty Member)', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const editedColumnValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
              value: newEmail,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: newPatronGroup,
            },
          ];

          usersToEdit.forEach((editedUser) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              editedUser.barcode,
              editedColumnValues,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              editedUser.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateWithSlashes,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
          BulkEditActions.downloadPreview();

          usersToEdit.forEach((editedUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          usersToEdit.forEach((editedUser) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              editedUser.barcode,
              editedColumnValues,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              editedUser.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateWithSlashes,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          usersToEdit.forEach((editedUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );
          });

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.verifyLogResultsFound();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(userUUIDsFileName, [
            patronUserInCollege.userId,
            staffUserInCollege.userId,
            user.userId,
          ]);
          BulkEditLogs.downloadFileWithMatchingRecords();

          usersToEdit.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.userId,
              'User name',
              testUser.username,
            );
          });

          BulkEditLogs.downloadFileWithErrorsEncountered();
          ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
            [`ERROR,${user.userId},${errorReason}`],
          ]);
          BulkEditLogs.downloadFileWithProposedChanges();

          usersToEdit.forEach((editedUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );
          });

          BulkEditLogs.downloadFileWithUpdatedRecords();

          usersToEdit.forEach((editedUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              editedColumnValues,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              editedUser.userId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              newExpirationDateInFile,
            );
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);

          usersToEdit.forEach((editedUser) => {
            UsersSearchPane.searchByUsername(editedUser.username);
            Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
            UsersSearchPane.openUser(editedUser.username);
            UsersCard.verifyExpirationDate(newExpirationDate);
            UsersCard.verifyEmail(newEmail);
            UsersSearchPane.resetAllFilters();
          });
        },
      );
    });
  });
});
