/* eslint-disable no-loop-func */
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const numberOfIterations = 4;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C356811 Users | Verify Download matched records (CSV) using Query search (firebird)',
      { tags: ['extendedPath', 'firebird', 'C356811'] },
      () => {
        let iterationNumber = 1;

        while (iterationNumber <= numberOfIterations) {
          const currentIteration = iterationNumber;

          // Step 1: Select "Users" radio button and click "Build query" button
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2: Build query that returns at least one record and click "Test query" button
          QueryModal.selectField(usersFieldValues.userBarcode);
          QueryModal.verifySelectedField(usersFieldValues.userBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(user.barcode);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 3: Click "Run query" button
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
            `getPreview_${currentIteration}`,
          );
          QueryModal.clickRunQuery();
          QueryModal.absent();

          cy.wait(`@getPreview_${currentIteration}`).then((interception) => {
            const bulkEditJobId = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            const currentFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
              bulkEditJobId,
              true,
            );

            // Step 4: Check the result of uploading and retrieving relevant Users data
            BulkEditSearchPane.verifyMatchedResults(user.barcode);
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 user');

            // Step 5: Click "Actions" menu and click "Download matched records (CSV)"
            BulkEditActions.downloadMatchedResults();

            // Step 6: Open downloaded file and check the records fulfill search criteria
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              currentFileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
              user.barcode,
              [
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
                  value: user.userId,
                },
                {
                  header: 'User name',
                  value: user.username,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
                  value: user.userGroup.group,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.ACTIVE,
                  value: true,
                },
              ],
            );

            // Return to bulk edit main page for next iteration
            BulkEditSearchPane.clickToBulkEditMainButton();

            // Clean up files for this iteration immediately
            BulkEditFiles.deleteAllDownloadedFiles(currentFileNames);
          });

          iterationNumber++;
        }
      },
    );
  });
});
