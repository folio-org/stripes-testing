import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          Permissions.bulkEditCsvView.gui,
          Permissions.bulkEditCsvEdit.gui,
          Permissions.bulkEditLogsView.gui,
          Permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      });

      it(
        'C367997 Verify that "Actions"  menu is hidden on the "Logs" tab-- Local approach (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C367997'] },
        () => {
          BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
          BulkEditSearchPane.verifyPanesBeforeImport();
          BulkEditSearchPane.verifyRecordTypeIdentifiers('Users');
          BulkEditSearchPane.verifyBulkEditPaneItems();
          BulkEditSearchPane.actionsIsAbsent();

          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.checkForUploading(userBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(user.barcode);
          BulkEditSearchPane.actionsIsShown();

          BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
          BulkEditActions.startBulkEditLocalButtonExists();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditSearchPane.actionsIsAbsent();

          BulkEditSearchPane.openIdentifierSearch();
          BulkEditSearchPane.verifyMatchedResults(user.barcode);
          BulkEditSearchPane.actionsIsShown();
        },
      );
    });
  });
});
