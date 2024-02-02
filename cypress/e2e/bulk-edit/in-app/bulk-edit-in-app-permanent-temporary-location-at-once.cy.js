import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';

let user;
const barcode = `barcode-${getRandomPostfix()}`;
const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  firstBarcode: barcode,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const testData = {
  folioInstances: InventoryInstances.generateFolioInstances(),
  servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(testData.defaultLocation);
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.firstBarcode);
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${item.firstBarcode}"`,
        }).then((res) => {
          res.temporaryLocation = { id: null };
          res.permanentLocation = { id: null };
          InventoryItems.editItemViaApi(res);
        });
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.firstBarcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.firstBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353635 Verify that user can bulk edit  permanent and temporary location at once (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcode');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.firstBarcode);
        // Download matched records
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.verifyMatchedResults(item.firstBarcode);
        BulkEditSearchPane.verifyPaneRecordsCount(1);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        // Select "Temporary item location" from "Options" dropdown and "Replace with" option from "Select option" dropdown;
        const newLocation1 = 'Online';
        BulkEditActions.selectOption('Temporary item location');
        BulkEditActions.selectAction('Replace with', 0);
        BulkEditActions.locationLookupExists();
        BulkEditActions.selectLocation(newLocation1, 0);
        // Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.isDisabledRowIcons(false);
        // Select "Item status" from "Options" dropdown and select item status in "Select item status" dropdown
        const newLocation2 = 'Online';
        BulkEditActions.selectOption('Permanent item location', 1);
        BulkEditActions.selectAction('Replace with', 1);
        BulkEditActions.selectLocation(newLocation2, 1);
        BulkEditActions.locationLookupExists();
        BulkEditActions.clickLocationLookup(1);
        BulkEditActions.verifyLocationLookupModal();
        Locations.selectInstitution(testData.defaultLocation.institutionName);
        BulkEditActions.locationLookupModalSaveAndClose();
        // Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        const changes = [newLocation1, newLocation2];
        BulkEditActions.verifyAreYouSureForm(1, item.firstBarcode);
        // Download preview
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [changes]);

        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [changes]);

        // Go to the "Inventory" app and search for the updated Items
        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.firstBarcode);
        ItemRecordView.verifyItemPermanentLocation(testData.defaultLocation.name);
        ItemRecordView.verifyTemporaryLocation(newLocation1);
      },
    );
  });
});
