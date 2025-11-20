import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C365635_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstancesA: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} A`,
        holdingsCount: 1,
        itemsCount: 1,
      }),
      folioInstancesB: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} B`,
        holdingsCount: 1,
        itemsCount: 0,
      }),
      barcodeOption: searchItemsOptions[1],
    };

    let user;
    let locationA;
    let locationB;
    let itemBarcode;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C365635_FolioInstance');

      cy.then(() => {
        cy.getLocations({
          limit: 10,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstancesA,
            location: locationA,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstancesB,
            location: locationB,
          });
        })
        .then(() => {
          itemBarcode = testData.folioInstancesA[0].items[0].barcode;
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui]).then(
        (userProperties) => {
          user = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstancesA[0].instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstancesB[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365635 Verify that search by "Barcode" for "Item" which moved from one "Instance" (source "Folio") to another (source "Folio") will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C365635'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(testData.folioInstancesA[0].instanceId);
        InventoryInstances.selectInstanceById(testData.folioInstancesA[0].instanceId);
        InventoryInstance.waitLoading();

        InventoryInstance.moveItemToAnotherInstance({
          fromHolding: locationA.name,
          toInstance: `${instanceTitlePrefix} B`,
          shouldOpen: true,
          itemIndex: 0,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(locationB.name, '1');

        InventoryInstance.openHoldings(locationB.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemBarcode, locationB.name);

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(testData.barcodeOption, itemBarcode);
        ItemRecordView.checkBarcode(itemBarcode);
        ItemRecordView.checkInstanceTitle(`${instanceTitlePrefix} B`);
      },
    );
  });
});
