import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_IDS } from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            temporaryLocationId: LOCATION_IDS.ONLINE,
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C369049 Verify that Errors accordoin displays correct identifier on the confirmation screen (Items barcodes) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C369049'] },
      () => {
        // Navigate to the "Bulk edit" app => Select the "Inventory-holdings" radio button on  the "Record types" accordion => Select  "Items barcode" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
        // Upload a .csv file  with "Items barcode" by dragging it on the "Drag & drop" area=> Click "Actions" menu => Select the "Start bulk edit" element
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        // Modify the record by selecting the **same value** that at least **one** Holdings record has (For example,"TEMPORARY HOLDINGS LOCATION" is "Annex" => Select "Annex" location by clicking on the value from  "Select location" dropdown list )
        const newLocation = 'Online';
        BulkEditActions.replaceTemporaryLocation(newLocation, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);

        // Click the "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
        BulkEditSearchPane.verifyErrorByIdentifier(
          item.itemBarcode,
          'No change in value required',
          'Warning',
        );
      },
    );
  });
});
