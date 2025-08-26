import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import DateTools from '../../../../support/utils/dateTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';

let user;
let staffUser;
let patronUser;
const patronUserEmail = 'patronUser@email.com';
const staffUserEmail = 'staffUser@email.com';
const updatedPatronUserEmail = 'UPDATEDpatronUser@email.com';
const newPatronGroup = 'staff';
const newExpirationDate = new Date();
const newExpirationDateWithSlashes = DateTools.getFormattedDateWithSlashes({
  date: new Date(),
});
const newExpirationDateInFile = `${DateTools.getFormattedDate({ date: newExpirationDate })} 23:59:59.000Z`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(userUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(userUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditUpdateRecords.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createTempUser([], 'faculty', 'patron', true, patronUserEmail)
            .then((patronUserProperties) => {
              patronUser = patronUserProperties;
            })
            .then(() => {
              cy.createTempUser([], 'faculty', 'staff', true, staffUserEmail).then(
                (staffUserProperties) => {
                  staffUser = staffUserProperties;
                },
              );
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${userUUIDsFileName}`,
                `${patronUser.userId}\n${staffUser.userId}`,
              );
            });
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.resetTenant();

        [patronUser, staffUser, user].forEach((userToDelete) => {
          Users.deleteViaApi(userToDelete.userId);
        });

        FileManager.deleteFileFromDownloadsByMask(
          userUUIDsFileName,
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C496156 Verify bulk edit actions for Users in Central tenant - Identifier (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C496156'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 user');
          BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          const testUsers = [staffUser, patronUser];

          testUsers.forEach((testUser) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              testUser.barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
              testUser.username,
            );
          });

          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, false);
          BulkEditActions.startBulkEditLocalAbsent();
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.userId,
              'User name',
              testUser.username,
            );
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.replaceEmail(patronUserEmail, updatedPatronUserEmail);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.fillExpirationDate(newExpirationDate, 1);
          BulkEditActions.verifyPickedDate(newExpirationDate, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.fillPatronGroup('staff (Staff Member)', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);

          const editedColumnValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: newPatronGroup,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              value: newExpirationDateWithSlashes,
            },
          ];
          const editedColumnValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
              value: newPatronGroup,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
              value: newExpirationDateInFile,
            },
          ];

          testUsers.forEach((testUser) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              testUser.barcode,
              editedColumnValues,
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            patronUser.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );
          BulkEditActions.downloadPreview();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              testUser.barcode,
              editedColumnValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            patronUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          testUsers.forEach((testUser) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              testUser.barcode,
              editedColumnValues,
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            patronUser.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              testUser.barcode,
              editedColumnValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            patronUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );

          // remove earlier diwnloaded files
          FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsFileName,
            previewFileName,
            changedRecordsFileName,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(userUUIDsFileName, [patronUser.userId, staffUser.userId]);
          BulkEditFiles.verifyCSVFileRecordsNumber(userUUIDsFileName, 2);
          BulkEditLogs.downloadFileWithMatchingRecords();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.userId,
              'User name',
              testUser.username,
            );
          });

          BulkEditLogs.downloadFileWithProposedChanges();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              testUser.barcode,
              editedColumnValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            patronUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );
          BulkEditLogs.downloadFileWithUpdatedRecords();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              testUser.barcode,
              editedColumnValuesInFile,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            patronUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            updatedPatronUserEmail,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(patronUser.username);
          Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
          UsersCard.verifyExpirationDate(newExpirationDate);
          UsersCard.openContactInfo();
          UsersCard.verifyEmail(updatedPatronUserEmail);
          UsersSearchPane.resetAllFilters();
          UsersSearchPane.searchByUsername(staffUser.username);
          Users.verifyPatronGroupOnUserDetailsPane(newPatronGroup);
          UsersCard.verifyExpirationDate(newExpirationDate);
          UsersCard.openContactInfo();
          UsersCard.verifyEmail(staffUserEmail);
        },
      );
    });
  });
});
