import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_IDS } from '../../../support/constants';

let user;

const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  barcode: `barcode-${getRandomPostfix()}`,
  locationId: LOCATION_IDS.ANNEX,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            res.permanentLocation = { id: item.locationId };
            InventoryItems.editItemViaApi(res);
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewOfProposedChangesFileName);
    });

    it(
      'C350938 Verify "Are you sure?" form in the in-app Items bulk edit form (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C350938'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();

        const newLocation = 'Online';
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.verifyItemOptions();
        BulkEditActions.replacePermanentLocation(newLocation);
        BulkEditActions.clickLocationLookup();
        BulkEditActions.verifyLocationLookupModal();
        BulkEditActions.locationLookupModalCancel();

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.barcode);
        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.confirmChanges();
        BulkEditActions.clickX();
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.verifyActionsDownloadChangedCSV();
        ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [newLocation]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyPermanentLocation(newLocation);
      },
    );
  });
});
