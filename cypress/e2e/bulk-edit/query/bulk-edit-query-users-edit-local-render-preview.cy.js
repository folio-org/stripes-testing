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
import { patronGroupNames, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let fileNames;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditQueryView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
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
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C440078 Render preview after query executed (Users - Edit Local) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C440078'] },
      () => {
        // Step 1: Select "Users" radio button and click "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        // Step 2: Select "Patron group - Name" option and configure query with multiple patron groups
        QueryModal.selectField(usersFieldValues.patronGroup);
        QueryModal.verifySelectedField(usersFieldValues.patronGroup);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.chooseFromValueMultiselect(patronGroupNames.STAFF);
        QueryModal.chooseFromValueMultiselect(patronGroupNames.FACULTY);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.barcode, 1);
        QueryModal.verifyQueryAreaContent(
          `(groups.group in [${patronGroupNames.STAFF}, ${patronGroupNames.FACULTY}]) AND (users.barcode == ${user.barcode})`,
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
          BulkEditSearchPane.verifyQueryHeadLine(
            `(groups.group in [${patronGroupNames.STAFF}, ${patronGroupNames.FACULTY}]) AND (users.barcode == ${user.barcode})`,
          );
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);

          // Step 7: Click "Actions" menu and verify available options (Edit Local)
          BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
          BulkEditActions.startBulkEditLocalAbsent();

          // Step 8: Click "Download matched records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
            user.barcode,
          );
        });
      },
    );
  });
});
