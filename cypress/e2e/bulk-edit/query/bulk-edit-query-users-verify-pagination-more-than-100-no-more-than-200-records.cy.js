import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

let user;
let fileNames;
const recordsToCreate = 102;
const testUsers = [];
const testCasePrefix = `AT_C436770_${randomFourDigitNumber()}`;
const newExpirationDate = DateTools.addDays(30);
const newExpirationDateInFile = `${DateTools.getFormattedDate({ date: newExpirationDate })}`;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      // Create 102 users with STAFF patron group and unique last name prefix
      for (let i = 0; i < recordsToCreate; i++) {
        cy.createTempUser(
          [],
          patronGroupNames.STAFF,
          'staff',
          true,
          `${testCasePrefix}${getRandomPostfix()}`,
        ).then((userProperties) => {
          testUsers.push(userProperties);
        });
      }

      // Create user with permissions for bulk edit
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUsersCreate.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        // Build and run query to find users by unique last name prefix
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.userEmail);
        QueryModal.verifySelectedField(usersFieldValues.userEmail);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
        QueryModal.fillInValueTextfield(testCasePrefix);
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        // Intercept the preview request to get bulk edit job ID
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();

        // Extract file names from intercepted request
        cy.wait('@getPreview').then((interception) => {
          const bulkEditJobId = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

          // Verify query returned 150 records
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(`${recordsToCreate} user`);
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();

      // Delete all created test users
      testUsers.forEach((testUser) => {
        Users.deleteViaApi(testUser.userId);
      });

      // Delete the user with permissions
      Users.deleteViaApi(user.userId);

      // Delete downloaded files
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C436770 Users | Verify pagination with more than 100 and no more than 200 records - Query tab (firebird)',
      { tags: ['criticalPath', 'firebird', 'C436770'] },
      () => {
        // Step 1-2: Verify paginator is displayed at the bottom of "Preview of record matched"
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(100, false);

        // Step 3-4: Click Next button to navigate to second page
        BulkEditSearchPane.clickNextPaginationButton();
        BulkEditSearchPane.verifyPaginationButtonStatesInMatchedAccordion(false, true);
        BulkEditSearchPane.verifyPaginationDisplay(101, recordsToCreate);

        // Step 5: Click Previous button to navigate back to first page
        BulkEditSearchPane.clickPreviousPaginationButton();
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(100, false);

        // Step 6: Download matched records CSV file
        BulkEditActions.downloadMatchedResults();

        testUsers.slice(0, 10).forEach((testUser) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            testUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.LAST_NAME,
            testUser.personal.lastName,
          );
        });

        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.matchedRecordsCSV, recordsToCreate);

        // Step 7-8: Open Start bulk edit and select option and action
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.selectOption('Expiration date');
        BulkEditActions.fillExpirationDate(newExpirationDate);

        // Step 9: Click Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          `${recordsToCreate} records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.`,
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(100, false);

        // Step 10: Download preview of proposed changes
        BulkEditActions.downloadPreview();

        testUsers.slice(0, 10).forEach((testUser) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
            testUser.userId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
            newExpirationDateInFile,
          );
        });

        // Step 11: Click Commit changes button
        BulkEditActions.commitChanges();

        // Wait for changes to be committed
        BulkEditSearchPane.verifyBulkEditQueryPaneExists();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyInputLabel(
          `${recordsToCreate} records have been successfully changed`,
        );

        // Step 12-13: Verify paginator on "Preview of records changed"
        BulkEditSearchPane.verifyPaginatorInChangedRecords(100, false);

        // Step 14-15: Click Next button to navigate to second page
        BulkEditSearchPane.clickNextInChangedAccordion();
        BulkEditSearchPane.verifyPaginationButtonStatesInChangedAccordion(false, true);
        BulkEditSearchPane.verifyPaginationDisplay(101, recordsToCreate);

        // Step 16: Click Previous button to navigate back
        BulkEditSearchPane.clickPreviousInChangedAccordion();
        BulkEditSearchPane.verifyPaginatorInChangedRecords(100, false);
      },
    );
  });
});
