import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('logs', () => {
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
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C367997 Verify that "Actions"  menu is hidden on the "Logs" tab-- Local approach (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyRecordIdentifierItems();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.actionsIsAbsent();

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.verifyDragNDropUpdateUsersArea();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.checkForUploading(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditSearchPane.actionsIsShown();

        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
        BulkEditActions.startBulkEditLocalButtonExists();

        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.actionsIsAbsent();

        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditSearchPane.actionsIsShown();
      },
    );
  });
});
