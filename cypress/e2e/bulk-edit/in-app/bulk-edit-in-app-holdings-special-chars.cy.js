import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, LOCATION_IDS } from '../../../support/constants';

let user;
const validHoldingHRIDsFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const secondValidHoldingHRIDsFileName = `secondValidHoldingHRIDsFileName${getRandomPostfix()}.csv`;
const inventoryEntity = {
  instanceName: `testBulkEditWithSpecial:;Chars_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          inventoryEntity.instanceName,
          inventoryEntity.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          inventoryEntity.holdingHRID = holdings[0].hrid;
          FileManager.createFile(
            `cypress/fixtures/${validHoldingHRIDsFileName}`,
            inventoryEntity.holdingHRID,
          );
        });

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          item.holdingHRID = holdings[0].hrid;
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            permanentLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
            // Updating holdings with special characters
            callNumber: 'number;special&characters',
            callNumberPrefix: 'number-prefix;special&characters',
            callNumberSuffix: 'number-prefix;special&characters',
            callNumberTypeId: '5ba6b62e-6858-490a-8102-5b1369873835',
            copyNumber: 'copy-number;special&characters',
            formerIds: ['former-id;special&characters'],
            numberOfItems: 'number-items;special&characters',
          });
          FileManager.createFile(
            `cypress/fixtures/${secondValidHoldingHRIDsFileName}`,
            holdings[0].hrid,
          );
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        inventoryEntity.itemBarcode,
      );
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingHRIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${secondValidHoldingHRIDsFileName}`);
    });

    it(
      'C366548 Verify that Holdings with special characters in title can be bulk edited (firebird)',
      { tags: ['criticalPath', 'firebird', 'C366548'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(inventoryEntity.holdingHRID);

        const tempLocation = 'Annex';

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings', 0);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(tempLocation);
        BulkEditActions.verifySuccessBanner(1);
      },
    );

    it(
      'C368481 Verify that there no errors during bulk editing Holdings with special characters (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C368481'] },
      () => {
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(secondValidHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);

        const location = 'Annex';
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replacePermanentLocation(location, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(location);
        BulkEditActions.verifySuccessBanner(1);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        InventoryInstance.verifyHoldingsPermanentLocation(location);
      },
    );
  });
});
