import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { patronGroupNames } from '../../../support/constants';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Query', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${user.barcode}\ninvalidBarcode123`,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C494352 Verify local approach (via csv file) is not supported in the Query tab (firebird)',
      { tags: ['extendedPath', 'firebird', 'C494352'] },
      () => {
        // Step 1: Select "Users" radio button and "User Barcodes" from dropdown
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        // Step 2: Upload CSV file with User Barcodes
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Click "Actions" menu once file uploading completes
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();
        BulkEditActions.startBulkEditLocalButtonExists();

        // Step 4: Switch to Query tab and build query
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.clickBuildQueryButton();

        // Step 5: Select "Patron group - Name" field
        QueryModal.verify();
        QueryModal.selectField(usersFieldValues.patronGroup);

        // Step 6: Select "equals" operator
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

        // Step 7: Enter value "staff"
        QueryModal.chooseValueSelect(patronGroupNames.STAFF);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userId, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.userId, 1);

        // Step 8: Click "Test query" button
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();

        // Step 9: Click "Run query" button once query completes
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();

        // Step 10: Verify "Actions" menu does not contain "Start bulk edit (Local)" option
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditActions.startBulkEditLocalAbsent();
      },
    );
  });
});
