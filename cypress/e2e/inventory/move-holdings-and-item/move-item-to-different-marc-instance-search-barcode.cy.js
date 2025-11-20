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
    const instanceTitlePrefix = `AT_C365636_MarcBibInstance_${randomPostfix}`;
    const barcodeOption = searchItemsOptions[1];
    const itemBarcode = `AT_C365636_ItemBarcode_${randomPostfix}`;

    let user;
    let locationA;
    let locationB;
    let loanType;
    let materialType;
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C365636_MarcBibInstance');

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
            instanceIds.push(instanceAId);
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
                  barcode: itemBarcode,
                });
              });

            cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix} B`).then((instanceBId) => {
              instanceIds.push(instanceBId);
              cy.getInstanceById(instanceBId).then((instanceBData) => {
                cy.createSimpleMarcHoldingsViaAPI(instanceBId, instanceBData.hrid, locationB.code);
              });
            });
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
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365636 Verify that search by "Barcode" for "Item" which moved from one "Instance" (source "MARC") to another (source "MARC") will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C365636'],
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

        InventoryInstance.moveItemToAnotherInstance({
          fromHolding: locationA.name,
          toInstance: `${instanceTitlePrefix} B`,
          shouldOpen: true,
          itemIndex: 0,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(locationB.name, '1');

        InventoryInstance.openHoldings(locationB.name);
        cy.stubBrowserPrompt();
        InventoryInstance.copyItemBarcode(0, locationB.name, true);
        cy.checkBrowserPrompt({ callNumber: 0, promptValue: itemBarcode });

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
