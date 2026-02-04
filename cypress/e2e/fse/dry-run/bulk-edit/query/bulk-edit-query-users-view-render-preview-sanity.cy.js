import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../../../support/fragments/bulk-edit/query-modal';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import DateTools from '../../../../../support/utils/dateTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../../support/constants';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let testUser;
let fileNames;
const currentDate = DateTools.getCurrentDate();
const pastExpirationDate = DateTools.getTwoPreviousDaysDateForFiscalYear();

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;

          cy.getUsers({ limit: 1, query: `username=${testUser.username}` }).then((users) => {
            cy.updateUser({
              ...users[0],
              expirationDate: pastExpirationDate,
            });
          });
        });
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);
      Users.deleteViaApi(testUser.userId);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C436917 Render preview after query executed (Users - View) (firebird)',
      { tags: ['dryRun', 'firebird', 'C436917'] },
      () => {
        // Step 1: Select "Users" radio button and click "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        // Step 2: Select "User - Expiration date" option and configure query
        QueryModal.selectField(usersFieldValues.expirationDate);
        QueryModal.verifySelectedField(usersFieldValues.expirationDate);
        QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN);
        QueryModal.pickDate(currentDate);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testUser.barcode, 1);
        QueryModal.verifyQueryAreaContent(
          `(users.expiration_date < ${currentDate}) AND (users.barcode == ${testUser.barcode})`,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.runQueryDisabled();

        // Step 3: Click "Test query" button and verify preview elements
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        // Step 4: Click "Run query" button
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();

        cy.wait('@getPreview').then((interception) => {
          const bulkEditJobId = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);

          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 user');

          // Step 5: Verify the "Set criteria" pane
          BulkEditSearchPane.verifySpecificTabHighlighted('Query');
          BulkEditSearchPane.isUsersRadioChecked(true);
          BulkEditSearchPane.isBuildQueryButtonDisabled(true);

          // Step 6: Verify the "Bulk edit query" main pane
          BulkEditSearchPane.verifyBulkEditQueryPaneExists();
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            testUser.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            testUser.barcode,
          );

          // Step 7: Click "Actions" menu and verify available options (View only)
          BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
          BulkEditSearchPane.verifySearchColumnNameTextFieldExists();

          // Step 8: Click "Download matched records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            testUser.barcode,
          );

          // Step 9: Click "Actions" menu and verify "Show columns" section
          BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
          BulkEditSearchPane.verifyUsersActionShowColumns();

          // Step 10: Click on "Search column name" and start typing "id"
          BulkEditSearchPane.searchColumnName('id');

          // Step 11: Check checkbox for "User id" column from filtered results
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          );
          BulkEditSearchPane.verifyResultColumnTitles(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID);

          // Step 12: Test searching for non-existing column
          BulkEditSearchPane.clearSearchColumnNameTextfield();
          BulkEditSearchPane.searchColumnName('non-existing', false);

          // Step 13: Clear search
          BulkEditSearchPane.clearSearchColumnNameTextfield();
          BulkEditSearchPane.verifySearchColumnNameTextFieldExists();
          BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

          // Step 14: Test removing a column - search and uncheck "User name" column
          BulkEditSearchPane.searchColumnName('user');
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USERNAME,
          );
        });
      },
    );
  });
});
