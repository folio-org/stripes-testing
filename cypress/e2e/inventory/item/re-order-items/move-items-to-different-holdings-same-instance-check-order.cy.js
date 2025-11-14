import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808502_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
      };

      const holdingsAOrders = [
        [1, 2, 3],
        [1, 2, 3, 4],
        [3, 4],
        [3, 4, 5],
      ];
      const holdingsBOrders = [
        [1, 2, 3, 4, 5],
        [1, 3, 4, 5],
        [1, 3, 4, 5, 6, 7],
        [1, 3, 4, 5, 6],
      ];

      let user;
      let locationA;
      let locationB;
      let materialType;
      let loanType;
      let holdingsAId;
      let holdingsBId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808502_FolioInstance');

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
          Permissions.uiInventoryMoveItems.gui,
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
        'C808502 Move items within different holdings of same instance (spitfire)',
        {
          tags: ['criticalPath', 'spitfire', 'C808502'],
        },
        () => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
          InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.openMoveItemsWithinAnInstance();
          InventoryInstance.moveItemToAnotherHolding({
            fromHolding: locationB.name,
            toHolding: locationA.name,
            shouldOpen: true,
            itemMoved: true,
            itemIndex: 1,
          });
          holdingsAOrders[1].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });
          holdingsBOrders[1].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationB.name,
              index,
              orderValue,
              true,
            );
          });

          InventoryInstance.moveItemToAnotherHolding({
            fromHolding: locationA.name,
            toHolding: locationB.name,
            shouldOpen: false,
            itemMoved: true,
            itemIndex: 0,
          });
          InventoryInstance.moveItemToAnotherHolding({
            fromHolding: locationA.name,
            toHolding: locationB.name,
            shouldOpen: false,
            itemMoved: true,
            itemIndex: 0,
          });
          holdingsAOrders[2].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });
          holdingsBOrders[2].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationB.name,
              index,
              orderValue,
              true,
            );
          });

          InventoryInstance.moveItemToAnotherHolding({
            fromHolding: locationB.name,
            toHolding: locationA.name,
            shouldOpen: false,
            itemMoved: true,
            itemIndex: 5,
          });
          holdingsAOrders[3].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });
          holdingsBOrders[3].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationB.name,
              index,
              orderValue,
              true,
            );
          });
        },
      );
    });
  });
});
