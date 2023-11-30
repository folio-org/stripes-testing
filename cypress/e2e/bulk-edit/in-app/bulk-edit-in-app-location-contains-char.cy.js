import { Locations } from '../../../support/fragments/settings/tenant/location-setup';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DateTools from '../../../support/utils/dateTools';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const item = {
      barcode: getRandomPostfix(),
      instanceName: `instance-${getRandomPostfix()}`,
    };
    const todayFormattedDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
    const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
    const matchedRecordsFileName = `${todayFormattedDate}-Matched-Records-${itemBarcodesFileName}`;
    const changedRecordsFileName = `${todayFormattedDate}-Changed-Records-${itemBarcodesFileName}`;
    const previewFileName = `${todayFormattedDate}-Updates-Preview-${itemBarcodesFileName}`;
    const locationName = `Location / ${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi({ ...testData.defaultLocation, name: locationName });
        cy.createTempUser([
          Permissions.bulkEditEdit.gui,
          Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        Users.deleteViaApi(testData.user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
        FileManager.deleteFileFromDownloadsByMask(previewFileName);
        FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
        Locations.deleteViaApi(testData.defaultLocation);
      });
    });

    it(
      'C357064 Verify Items bulk edit if the location name contains "/" (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        // Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        // Upload a .csv file with items barcodes (see Preconditions) by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        // Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        // Click "Actions" menu => Check checkboxes (if not yet checked) next to:
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Item permanent location',
          'Item temporary location',
        );
        BulkEditSearchPane.verifyResultColumTitles('Item permanent location');
        BulkEditSearchPane.verifyResultColumTitles('Item temporary location');
        // Click "Actions" menu => Select "Download matched records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          item.barcode,
          'Permanent Location',
          'Temporary Location',
        ]);
        // Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openInAppStartBulkEditFrom();
        // Select "Temporary item location" from "Select option" dropdown => Select "Replace with" option from  "Select action" dropdown
        BulkEditActions.replaceTemporaryLocation(locationName);
        // Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        // Select "Permanent item location" from  "Select option" dropdown on the new row => Select "Replace with" option from  "Select action" dropdown
        BulkEditActions.replacePermanentLocation(locationName, 'item', 1);
        // Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, locationName);
        // Click the "Download preview" button
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          item.barcode,
          locationName,
          'Permanent Location',
          'Temporary Location',
        ]);
        // Click the "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.waitFileUploading();
        // Click the "Actions" menu => Select "Download changed records (CSV)" element
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          item.barcode,
          locationName,
          'Permanent Location',
          'Temporary Location',
        ]);
        // Go to the "Inventory" app => Search for the updated Items
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        // The Items permanent and temporary locations are updated accordingly
        ItemRecordView.verifyPermanentLocation(locationName);
        ItemRecordView.verifyTemporaryLocation(locationName);
      },
    );
  });
});
