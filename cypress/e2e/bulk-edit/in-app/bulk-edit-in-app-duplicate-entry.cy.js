import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let viewUser;
const invalidBarcode = getRandomPostfix();
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const invalidUserBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidUserBarcodesFileName,
);
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditCsvView.gui, permissions.uiUsersView.gui]).then(
        (userProperties) => {
          viewUser = userProperties;
        },
      );
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${item.itemBarcode}\n${item.itemBarcode}`,
        );
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${user.barcode}\n${user.barcode}`,
        );
        FileManager.createFile(
          `cypress/fixtures/${invalidUserBarcodesFileName}`,
          `${user.barcode}\n${user.barcode}\n${invalidBarcode}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidUserBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);
    });

    it(
      'C350933 Verify Errors accordion with repeated records (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C350933'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(user.barcode, 'Duplicate entry', 'Warning');
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyReasonForError(item.itemBarcode, 'Duplicate entry', 'Warning');
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
      },
    );

    it(
      'C347883 Error messages in submitted identifiers (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C347883'] },
      () => {
        cy.login(viewUser.username, viewUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(invalidUserBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1, 1);
        BulkEditSearchPane.verifyReasonForError('Duplicate entry');
        BulkEditSearchPane.verifyReasonForError('No match found');
        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
          user.barcode,
          invalidBarcode,
          'Duplicate entry',
          'No match found',
        ]);
      },
    );
  });
});
