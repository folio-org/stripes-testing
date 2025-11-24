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
    const instanceTitlePrefix = `AT_C366106_FolioInstance_${randomPostfix}`;
    const barcodeOption = searchItemsOptions[1];
    const instancesData = {
      folioInstancesA: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} A`,
        holdingsCount: 1,
        itemsCount: 1,
      }),
      folioInstancesB: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} B`,
        holdingsCount: 0,
        itemsCount: 0,
      }),
    };

    let user;
    let location;
    let itemBarcode;
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C366106');

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then((res) => {
          location = res;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: instancesData.folioInstancesA,
            location,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: instancesData.folioInstancesB,
          });
        })
        .then(() => {
          instanceIds.push(
            instancesData.folioInstancesA[0].instanceId,
            instancesData.folioInstancesB[0].instanceId,
          );
          itemBarcode = instancesData.folioInstancesA[0].items[0].barcode;

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
            Permissions.uiInventoryHoldingsMove.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C366106 Verify that search by "Barcode" for "Item" which moved with "Holdings" (source = Folio) from one "Instance" to another will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C366106'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(instanceIds[0]);
        InventoryInstances.selectInstanceById(instanceIds[0]);
        InventoryInstance.waitLoading();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
          location.name,
          `${instanceTitlePrefix} B`,
        );
        InventoryInstancesMovement.checkHoldingsMoveSuccessCallout(1);
        InventoryInstancesMovement.verifyHoldingsMoved(location.name, '1');

        InventoryInstance.openHoldings(location.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemBarcode, location.name);

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(barcodeOption, itemBarcode);
        ItemRecordView.checkBarcode(itemBarcode);
        ItemRecordView.checkInstanceTitle(`${instanceTitlePrefix} B`);
      },
    );
  });
});
