import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../../../support/fragments/topMenu';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let instanceTypeId;
let holdingsTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
const items = [];

for (let i = 0; i < 3; i++) {
  items.push({
    instanceName: `AT_C359225_testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  });
}

const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          // Fetch required type IDs
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            locationId = locationData.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getDefaultMaterialType().then((materialType) => {
            materialTypeId = materialType.id;
          });
        })
        .then(() => {
          let fileContent = '';
          items.forEach((item) => {
            item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
            fileContent += `${item.itemBarcode}\r\n${item.secondBarcode}\r\n`;

            // Create FOLIO instance with holdings and 2 items
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: item.instanceName,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locationId,
                },
              ],
              items: [
                {
                  barcode: item.itemBarcode,
                  status: { name: 'Available' },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                },
                {
                  barcode: item.secondBarcode,
                  status: { name: 'Available' },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                },
              ],
            });
          });

          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
        });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C359225 Verify the in-app bulk edit temporary loan type (firebird)',
      { tags: ['dryRun', 'firebird', 'C359225'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillTemporaryLoanType('Selected');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();

        items.forEach((item) => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.closeDetailView();
          InventoryInstance.openHoldings(['']);
          InventoryInstance.verifyLoan('Selected');
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
