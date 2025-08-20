import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
let errorsFromCommittingFileName;
let bulkEditJobId;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const reasonForError = 'No change in value required';
const emailStarts = `C436762_test_${getRandomPostfix()}`;
const testUsers = [
  {
    username: getTestEntityValue('username'),
    email: `${emailStarts}@gmail.com`,
  },
  {
    username: getTestEntityValue('username'),
    email: `${emailStarts}@folio.org`,
  },
];

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data, run query, and perform bulk edit', () => {
        cy.createTempUser([
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;

          testUsers.forEach((testUser) => {
            Users.createViaApi({
              active: true,
              username: testUser.username,
              personal: {
                preferredContactTypeId: '002',
                lastName: getTestEntityValue('lastName'),
                email: testUser.email,
              },
              departments: [],
              type: 'staff',
            }).then((createdUser) => {
              testUser.id = createdUser.id;
            });
          });
          cy.then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });

            // Step 1: Build and run Bulk edit query for "Users"
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkUsersRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(usersFieldValues.userEmail);
            QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
            QueryModal.fillInValueTextfield(emailStarts);
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
            QueryModal.clickTestQuery();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();
            cy.wait('@getPreview', getLongDelay()).then((interception) => {
              const interceptedUuid = interception.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              bulkEditJobId = interceptedUuid;
              identifiersQueryFilename = `Query-${bulkEditJobId}.csv`;
              matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${bulkEditJobId}.csv`;
              previewFileName = `${today}-Updates-Preview-CSV-Query-${bulkEditJobId}.csv`;
              changedRecordsFileName = `${today}-Changed-Records-CSV-Query-${bulkEditJobId}.csv`;
              errorsFromCommittingFileName = `${today}-Committing-changes-Errors-Query-${bulkEditJobId}.csv`;
            });

            // Step 2: Perform bulk edit so that part of Users records are edited and part are left unchanged
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.replaceEmail(testUsers[0].email, testUsers[1].email);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyErrorLabel(0, 1);
            BulkEditSearchPane.verifyErrorByIdentifier(testUsers[1].id, reasonForError, 'Warning');
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        testUsers.forEach((testUser) => {
          Users.deleteViaApi(testUser.id);
        });

        FileManager.deleteFilesFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C436762 Verify generated Logs files for Users (Query - In app) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C436762'] },
        () => {
          // Step 1: Check "Users" checkbox on "Record types" filter accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkUsersCheckbox();

          // Step 2: Check values in Status and Editing columns
          BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
          BulkEditLogs.verifyEditingColumnValue(user.username, 'In app');

          // Step 3: Click on the ... action element
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

          // Step 4: Download identifiers file
          BulkEditLogs.downloadQueryIdentifiers();
          ExportFile.verifyFileIncludes(identifiersQueryFilename, [
            testUsers[0].id,
            testUsers[1].id,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 2);

          // Step 5: Download matching records file
          BulkEditLogs.downloadFileWithMatchingRecords();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.id,
            );
          });

          BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 2);

          // Step 6: Download preview of proposed changes file
          BulkEditLogs.downloadFileWithProposedChanges();

          testUsers.forEach((testUser) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
              testUser.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
              testUsers[1].email,
            );
          });
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(previewFileName, 2);

          // Step 7: Download updated records file
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            testUsers[0].id,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL,
            testUsers[1].email,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileName, 1);

          // Step 8: Download errors encountered file
          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `WARNING,${testUsers[1].id},${reasonForError}`,
          ]);
        },
      );
    });
  });
});
