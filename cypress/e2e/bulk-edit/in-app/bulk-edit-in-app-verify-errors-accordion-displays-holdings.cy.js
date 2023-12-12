import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
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
          item.holdingUUID = holdings[0].id;
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, item.holdingUUID);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C369051 Verify that Errors accordion displays correct identifier on the confirmation screen (Holdings UUIDs) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        // Navigate to the "Bulk edit" app => Select the "Inventory-holdings" radio button on  the "Record types" accordion => Select  "Holdings UUIDs" option from the "Record identifier" dropdon
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
        // Upload a .csv file  with "Holdings UUIDs" by dragging it on the "Drag & drop" area=> Click "Actions" menu => Select the "Start bulk edit" element
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        // Modify the record by selecting the **same value** that at least **one** Holdings record has (For example,"TEMPORARY HOLDINGS LOCATION" is "Annex" => Select "Annex" location by clicking on the value from  "Select location" dropdown list )
        const newLocation = 'Online';
        BulkEditActions.selectOption('Permanent holdings location');
        BulkEditActions.clickSelectedLocation('Select location', newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
        // Click the "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyNonMatchedResults(item.holdingUUID);
      },
    );
  });
});
