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
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C365637_Instance_${randomPostfix}`;
    const barcodeOption = searchItemsOptions[1];
    const itemABarcode = `AT_C365637_ItemBarcode_${randomPostfix}`;
    const folioInstancesB = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: `${instanceTitlePrefix} B`,
      holdingsCount: 1,
      itemsCount: 1,
    });

    let user;
    let locationA;
    let locationB;
    let loanType;
    let materialType;
    let marcInstanceId;
    let itemBBarcode;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C365637_Instance');

      cy.then(() => {
        cy.getLocations({
          limit: 10,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
      })
        .then(() => {
          cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix} A`).then((instanceAId) => {
            marcInstanceId = instanceAId;
            cy.getInstanceById(instanceAId)
              .then((instanceAData) => {
                cy.createSimpleMarcHoldingsViaAPI(instanceAId, instanceAData.hrid, locationA.code);
              })
              .then((createdHoldingsId) => {
                cy.createItem({
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  holdingsRecordId: createdHoldingsId,
                  materialType: { id: materialType.id },
                  permanentLoanType: { id: loanType.id },
                  barcode: itemABarcode,
                });
              });

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: folioInstancesB,
              location: locationB,
            });
            itemBBarcode = folioInstancesB[0].items[0].barcode;
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstanceId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstancesB[0].instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365637 Verify that search by "Barcode" for "Item" which moved from one "Instance" (source "MARC") to another (source "Folio") will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C365637'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.searchByTitle(marcInstanceId);
        InventoryInstances.selectInstanceById(marcInstanceId);
        InventoryInstance.waitLoading();

        InventoryInstance.moveItemToAnotherInstance({
          fromHolding: locationA.name,
          toInstance: `${instanceTitlePrefix} B`,
          shouldOpen: true,
          itemIndex: 1,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(locationB.name, '2');
        InventoryInstance.openHoldings(locationB.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemABarcode, locationB.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemABarcode, locationA.name, false);

        InventoryInstance.moveItemBackToInstance(
          locationB.name,
          `${instanceTitlePrefix} A`,
          false,
          0,
        );
        InventoryInstance.openHoldings(locationA.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemBBarcode, locationA.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(itemBBarcode, locationB.name, false);

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.selectSearchOption(barcodeOption);
        InventorySearchAndFilter.executeSearch(itemABarcode);
        ItemRecordView.checkBarcode(itemABarcode);
        ItemRecordView.checkInstanceTitle(`${instanceTitlePrefix} B`);
        ItemRecordView.closeDetailView();

        InventorySearchAndFilter.selectSearchOption(barcodeOption);
        InventorySearchAndFilter.executeSearch(itemBBarcode);
        ItemRecordView.checkBarcode(itemBBarcode);
        ItemRecordView.checkInstanceTitle(`${instanceTitlePrefix} A`);
      },
    );
  });
});
