import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';

let user;
const locations = {};
const barcode = `barcode-${getRandomPostfix()}`;
const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  firstBarcode: barcode,
  secondBarcode: `secondBarcode_${barcode}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        Locations.getViaApiAnyDefault(2).then((fetchedLocations) => {
          locations.firstLocationId = fetchedLocations[0].id;
          locations.firstLocationName = fetchedLocations[0].name;
          locations.secondLocationId = fetchedLocations[1].id;
          locations.secondLocationName = fetchedLocations[1].name;

          InventoryInstances.createInstanceViaApi(item.instanceName, item.firstBarcode);
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.firstBarcode}"`,
          }).then((res) => {
            res.temporaryLocation = { id: locations.firstLocationId };
            res.permanentLocation = { id: locations.secondLocationId };
            InventoryItems.editItemViaApi(res);
          });
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.secondBarcode}"`,
          }).then((res) => {
            res.temporaryLocation = { id: locations.firstLocationId };
            res.permanentLocation = { id: locations.firstLocationId };
            InventoryItems.editItemViaApi(res);
          });
          FileManager.createFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${item.firstBarcode}\r\n${item.secondBarcode}`,
          );
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.firstBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C357067 Negative: Verify populating preview on the "Are you sure" form (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C357067'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.verifyMatchedResults(item.firstBarcode, item.secondBarcode);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();

        const newLocation = locations.firstLocationName;

        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.replaceTemporaryLocation(newLocation);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(newLocation, 'item', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2, item.firstBarcode);
        BulkEditActions.verifyAreYouSureForm(2, item.secondBarcode);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(item.firstBarcode);
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          item.secondBarcode,
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
      },
    );
  });
});
