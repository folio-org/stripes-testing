import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_NAMES } from '../../../support/constants';

let user;
const folioInstance = {
  barcode: getRandomPostfix(),
  instanceName: `AT_C430235_FolioInstance_${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(folioInstance.instanceName, folioInstance.barcode);

        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, folioInstance.barcode);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioInstance.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C430235 Verify that the "Confirm changes" button is disabled until at least one update action is selected (firebird)',
      { tags: ['extendedPath', 'firebird', 'C430235'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button and "Item barcode" option
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload .csv file with Items barcodes
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.barcode);

        // Step 3: Click "Actions" menu
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, false);

        // Step 4: Select the "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Step 5: Click on the "Select option" dropdown => Select "Permanent item location" option
        BulkEditActions.selectOption('Permanent item location');
        BulkEditActions.verifyOptionSelected('Permanent item location');

        // Step 6: Click on "Select action" dropdown => Select "Replace with" action
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.verifySecondActionSelected('Replace with');

        // Step 7: DO NOT select any location => Check the "Confirm changes" button
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 8: Click on "Select location" dropdown => Select any location
        BulkEditActions.selectLocation(LOCATION_NAMES.ANNEX_UI);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Click again on "Select location" dropdown => Select "Select location" placeholder
        BulkEditActions.clickSelectedLocation(LOCATION_NAMES.ANNEX_UI, 'Select location');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 10: Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 11: Click on the "Select option" dropdown => Select "Temporary item location" option
        BulkEditActions.selectOption('Temporary item location', 1);
        BulkEditActions.verifyOptionSelected('Temporary item location', 1);

        // Step 12: Click on "Select action" dropdown => Select "Replace with" action
        BulkEditActions.selectSecondAction('Replace with', 1);
        BulkEditActions.verifySecondActionSelected('Replace with', 1);

        // Step 13: DO NOT select any location => Check the "Confirm changes" button
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 14: Click on "Select location" dropdown => Select any location
        BulkEditActions.selectLocation(LOCATION_NAMES.ANNEX_UI, 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 15: Click again on "Select location" dropdown => Select "Select location" placeholder
        BulkEditActions.clickSelectedLocation(LOCATION_NAMES.ANNEX_UI, 'Select location', 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 16: Click again on "Select location" dropdown => Select any location
        BulkEditActions.selectLocation(LOCATION_NAMES.ANNEX_UI, 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 17: Click again on "Select location" on first "Permanent item location" row
        BulkEditActions.selectLocation(LOCATION_NAMES.ANNEX_UI, 0);
        BulkEditActions.verifyConfirmButtonDisabled(false);
      },
    );
  });
});
