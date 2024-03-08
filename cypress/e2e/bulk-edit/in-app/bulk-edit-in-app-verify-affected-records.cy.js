import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const previewFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const barcode = `barcode-${getRandomPostfix()}`;
const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  firstBarcode: barcode,
  secondBarcode: `secondBarcode_${barcode}`,
  annexId: '53cf956f-c1df-410b-8bea-27f712cca7c0',
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.firstBarcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.firstBarcode}"` }).then(
          (res) => {
            res.temporaryLocation = { id: item.annexId };
            InventoryItems.editItemViaApi(res);
          },
        );
        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${item.firstBarcode}\r\n${item.secondBarcode}`,
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.firstBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewFileName);
    });

    it(
      'C353633 Verify that the in-app bulk edit preview contains affected records (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcode');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.verifyMatchedResults(item.firstBarcode, item.secondBarcode);
        BulkEditSearchPane.waitFileUploading();
        // Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item temporary location');
        BulkEditSearchPane.verifyResultColumTitles('Item temporary location');

        BulkEditActions.openInAppStartBulkEditFrom();
        const tempLocation = 'Annex';
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'item', 0);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2, tempLocation);
        BulkEditActions.downloadPreview();

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns('Item temporary location', tempLocation);
        BulkEditSearchPane.verifyErrorLabelAfterChanges(itemBarcodesFileName, 1, 1);
        BulkEditSearchPane.verifyReasonForError('No change in value required');

        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyLocationChanges(1, 'Annex');
      },
    );
  });
});
