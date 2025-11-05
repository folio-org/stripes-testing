import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryInstancesMovement from '../../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808504_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstancesA: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix} A`,
          holdingsCount: 2,
          itemsCount: 0,
        }),
        folioInstancesB: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix} B`,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        holdingsCalloutPart: 'holding has been successfully moved',
      };

      const holdingsAOrders = [[1, 3, 4]];
      const holdingsBOrders = [[1, 2, 3, 4, 5]];
      const holdingsCOrders = [[2, 3, 4]];

      const waitForUiToStabilize = () => cy.wait(1000);

      let user;
      let locationA;
      let locationB;
      let locationC;
      let materialType;
      let loanType;
      let holdingsAId;
      let holdingsBId;
      let holdingsCId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808504_FolioInstance');

        cy.then(() => {
          // Get required reference data - need 2 different locations for multiple holdings
          cy.getLocations({
            limit: 10,
            query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
          }).then(() => {
            locationA = Cypress.env('locations')[0];
            locationB = Cypress.env('locations')[1];
            locationC = Cypress.env('locations')[2];
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
              location: locationC,
            });
          })
          .then(() => {
            holdingsAId = testData.folioInstancesA[0].holdings[0].id;
            holdingsBId = testData.folioInstancesA[0].holdings[1].id;
            holdingsCId = testData.folioInstancesB[0].holdings[0].id;
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
            // Create initial items for Holdings A (3 items with order 1, 3, 4)
            holdingsAOrders[0].forEach((orderValue) => {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsAId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order: orderValue,
              });
            });
            // Create initial items for Holdings B (5 items with order 1, 2, 3, 4, 5)
            holdingsBOrders[0].forEach((orderValue) => {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsBId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order: orderValue,
              });
            });
            // Create initial items for Holdings C (3 items with order 2, 3, 4)
            holdingsCOrders[0].forEach((orderValue) => {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsCId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order: orderValue,
              });
            });
          });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.uiInventoryMoveItems.gui,
          Permissions.uiInventoryHoldingsMove.gui,
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
        'C808504 Move holdings within different instances (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C808504'],
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

          InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
            locationA.name,
            `${instanceTitlePrefix} B`,
          );
          InteractorsTools.checkCalloutContainsMessage(testData.holdingsCalloutPart);
          InteractorsTools.closeAllVisibleCallouts();
          waitForUiToStabilize();
          InventoryInstancesMovement.verifyHoldingsMoved(
            locationA.name,
            `${holdingsAOrders[0].length}`,
          );
          InventoryInstance.openHoldings(locationA.name);
          holdingsAOrders[0].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });

          InventoryInstancesMovement.closeInLeftForm();
          InventoryInstance.waitLoading();
          InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
            locationA.name,
            `${instanceTitlePrefix} A`,
          );
          InteractorsTools.checkCalloutContainsMessage(testData.holdingsCalloutPart);
          InteractorsTools.closeAllVisibleCallouts();
          waitForUiToStabilize();
          InventoryInstancesMovement.verifyHoldingsMoved(
            locationA.name,
            `${holdingsAOrders[0].length}`,
          );
          InventoryInstance.openHoldings(locationA.name);
          holdingsAOrders[0].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              index,
              orderValue,
              true,
            );
          });

          InventoryInstancesMovement.closeInRightForm();
          InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
            locationC.name,
            `${instanceTitlePrefix} A`,
          );
          InteractorsTools.checkCalloutContainsMessage(testData.holdingsCalloutPart);
          InteractorsTools.closeAllVisibleCallouts();
          waitForUiToStabilize();
          InventoryInstancesMovement.verifyHoldingsMoved(
            locationC.name,
            `${holdingsAOrders[0].length}`,
          );
          InventoryInstance.openHoldings(locationC.name);
          holdingsCOrders[0].forEach((orderValue, index) => {
            InventoryInstance.checkItemOrderValueInHoldings(
              locationC.name,
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
