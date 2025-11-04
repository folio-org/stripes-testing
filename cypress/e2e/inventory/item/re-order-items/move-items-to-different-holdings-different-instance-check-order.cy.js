import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryInstancesMovement from '../../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808503_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstancesA: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix} A`,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        folioInstancesB: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix} B`,
          holdingsCount: 1,
          itemsCount: 0,
        }),
      };

      const holdingsAOrders = [
        [1, 2, 3],
        [1, 2, 3, 4],
        [3, 4],
      ];
      const holdingsBOrders = [
        [1, 2, 3, 4, 5],
        [1, 3, 4, 5],
        [1, 3, 4, 5, 6, 7],
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808503_FolioInstance');

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
            // Create instances with holdings (no items initially)
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
            holdingsAId = testData.folioInstancesA[0].holdings[0].id;
            holdingsBId = testData.folioInstancesB[0].holdings[0].id;

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
          testData.folioInstancesA[0].instanceId,
        );
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstancesB[0].instanceId,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C808503 Move items within different holdings of different instances (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C808503'],
        },
        () => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });

          InventoryInstances.searchByTitle(testData.folioInstancesB[0].instanceId);
          InventoryInstances.selectInstanceById(testData.folioInstancesB[0].instanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.moveItemToAnotherInstance({
            fromHolding: locationB.name,
            toInstance: `${instanceTitlePrefix} A`,
            shouldOpen: true,
            itemIndex: 1,
          });
          InventoryInstancesMovement.verifyHoldingsMoved(
            locationA.name,
            `${holdingsAOrders[1].length}`,
          );
          InventoryInstance.openHoldings(locationA.name);
          holdingsAOrders[1].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });

          InventoryInstancesMovement.closeInLeftForm();
          InventoryInstance.waitLoading();
          InventoryInstance.moveItemToAnotherInstance({
            fromHolding: locationA.name,
            toInstance: `${instanceTitlePrefix} B`,
            shouldOpen: true,
            itemIndex: 0,
          });
          InventoryInstancesMovement.closeInRightForm();
          InventoryInstance.waitLoading();
          InventoryInstance.moveItemToAnotherInstance({
            fromHolding: locationA.name,
            toInstance: `${instanceTitlePrefix} B`,
            shouldOpen: true,
            itemIndex: 0,
          });
          InventoryInstancesMovement.verifyHoldingsMoved(
            locationB.name,
            `${holdingsBOrders[2].length}`,
          );
          InventoryInstance.openHoldings(locationB.name);
          holdingsBOrders[2].forEach((orderValue, index) => {
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
