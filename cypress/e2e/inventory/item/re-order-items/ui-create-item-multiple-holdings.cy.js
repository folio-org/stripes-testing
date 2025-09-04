import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808497_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
      };

      let user;
      let locationA;
      let locationB;
      let materialType;
      let loanType;
      let holdingsAId;
      let holdingsBId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808497_FolioInstance');

        cy.then(() => {
          // Get required reference data - need 2 different locations for multiple holdings
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
            // Create instance with 2 holdings (no items initially)
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location: locationA,
            });
            holdingsAId = testData.folioInstances[0].holdings[0].id;
            holdingsBId = testData.folioInstances[0].holdings[1].id;
            cy.getHoldings({
              limit: 1,
              query: `"id"="${holdingsBId}"`,
            }).then((holdings) => {
              // Update second holdings location
              cy.updateHoldingRecord(holdingsBId, {
                ...holdings[0],
                permanentLocationId: locationB.id,
              });
            });
          })
          .then(() => {
            // Create initial items for Holdings A (3 items with order 1, 2, 3)
            for (let i = 1; i <= 3; i++) {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsAId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order: i,
              });
            }
            // Create initial items for Holdings B (5 items with order 1, 2, 3, 4, 5)
            for (let i = 1; i <= 5; i++) {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsBId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order: i,
              });
            }
          });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[0].instanceId,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C808497 Create "Item" with empty "order" field (default state) when Instance has multiple Holdings with Items (spitfire)',
        {
          tags: ['criticalPath', 'spitfire', 'C808497'],
        },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();

          // Navigate to the instance
          InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
          InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();

          // Step 1: Add Item record to Holdings A
          const holdingsAItemBarcode = `AT_C808497_Item1_${uuid()}`;

          // Find Holdings A by location name and add item
          InventoryInstance.clickAddItemByHoldingName({
            holdingName: `${locationA.name} >`,
            instanceTitle: instanceTitlePrefix,
          });
          ItemRecordNew.waitLoading(instanceTitlePrefix);
          ItemRecordNew.fillItemRecordFields({
            barcode: holdingsAItemBarcode,
            materialType: materialType.name,
            loanType: loanType.name,
          });
          // Note: Not filling order field to test default auto-assignment
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 3: Add Item record to Holdings B
          const holdingsBItemBarcode = `AT_C808497_Item2_${uuid()}`;

          // Find Holdings B by location name and add item
          InventoryInstance.clickAddItemByHoldingName({
            holdingName: `${locationB.name} >`,
            instanceTitle: instanceTitlePrefix,
          });
          ItemRecordNew.waitLoading(instanceTitlePrefix);
          ItemRecordNew.fillItemRecordFields({
            barcode: holdingsBItemBarcode,
            materialType: materialType.name,
            loanType: loanType.name,
          });
          // Note: Not filling order field to test default auto-assignment
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 6: Expand Holdings A accordion and verify order field
          InventoryInstance.openHoldingsAccordion(`${locationA.name} >`);

          // Verify Holdings A items: existing 3 items (order 1,2,3) + new item (order 4)
          InventoryItems.getItemsInHoldingsViaApi(holdingsAId).then((itemsA) => {
            const newItemA = itemsA.find((item) => item.barcode === holdingsAItemBarcode);
            expect(newItemA.order).to.equal(4);
            const orderValuesA = itemsA.map((item) => item.order);
            expect(orderValuesA).to.deep.equal([1, 2, 3, 4]);
          });

          // Step 7: Expand Holdings B accordion and verify order field
          InventoryInstance.openHoldingsAccordion(`${locationB.name} >`);

          // Verify Holdings B items: existing 5 items (order 1,2,3,4,5) + new item (order 6)
          InventoryItems.getItemsInHoldingsViaApi(holdingsBId).then((itemsB) => {
            const newItemB = itemsB.find((item) => item.barcode === holdingsBItemBarcode);
            expect(newItemB.order).to.equal(6);
            const orderValuesB = itemsB.map((item) => item.order);
            expect(orderValuesB).to.deep.equal([1, 2, 3, 4, 5, 6]);
          });
        },
      );
    });
  });
});
