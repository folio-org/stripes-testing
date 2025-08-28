import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const locations = 'Annex';
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const testData = {
  servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Locations.createViaApi(testData.defaultLocation);
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
      });
    });

    after('Delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C365584 Verify  "Save & close" button on the "Location look-up" (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C365584'] },
      () => {
        // Select "Inventory-Items" app => Select ""Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        // Upload a .csv file with items barcodes  (see Preconditions) by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        // Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        // Select "Temporary item location" from  "Options" dropdown => Select "Replace with" option from  "Select action" dropdown
        BulkEditActions.replaceTemporaryLocation(locations);
        // Open "Select location" by clicking on "Location look-up" => Select  Item's Campus with just one location so that location is auto populated (e.g. "Online")
        BulkEditActions.clickLocationLookup();
        Locations.selectInstitution(testData.defaultLocation.institutionName);
        BulkEditSearchPane.isSaveAndCloseButtonDisabled(false);
      },
    );
  });
});
