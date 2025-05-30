import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
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
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, holdings[0].hrid);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
    });

    it(
      'C375095 Verify default state of Bulk edit landing page (In app - inventory approach) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C375095'] },
      () => {
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.isHoldingsRadioChecked(true);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled(false);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        // "Inventory - holdings" non-selected
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        // "Inventory - items" non-selected
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        //  "Select record identifier" is displayed as the first option in the "Record identifier" dropdown (disabled)
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.isHoldingsRadioChecked(true);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled(false);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        // "Inventory - holdings" non-selected
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        // "Inventory - items" non-selected
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // #7 Select the "Inventory-holdings" radio button from the "Record types" accordion => Select the "Holdings HRIDs" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');

        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        // "Inventory - holdings" non-selected
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        // "Inventory - items" non-selected
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
