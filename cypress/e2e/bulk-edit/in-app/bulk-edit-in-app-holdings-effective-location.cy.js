import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  instanceId: '',
  holdingUUID: '',
  holdingHRID: '',
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
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
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, item.holdingUUID);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.deleteHoldingRecordViaApi(item.holdingUUID);
      InventoryInstance.deleteInstanceViaApi(item.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
    });

    it(
      'C380547 Verify updating Holdings "Effective location" in case of updating Holdings "Temporary location" (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Effective location');

        BulkEditActions.openInAppStartBulkEditFrom();
        const newLocation = 'Online';
        BulkEditActions.replaceTemporaryLocation(newLocation, 'holdings');
        BulkEditActions.confirmChanges();

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns('Temporary location', newLocation);
        BulkEditSearchPane.verifyChangesUnderColumns('Effective location', newLocation);

        // Delete items because only holdings with no items have field "Effective location" in Inventory
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${item.itemBarcode}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteItemViaApi(instance.items[1].id);
        });

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkTemporaryLocation(newLocation);
        HoldingsRecordView.checkEffectiveLocation(newLocation);
      },
    );
  });
});
