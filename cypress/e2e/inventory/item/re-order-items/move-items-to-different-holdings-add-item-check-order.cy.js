import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C916227_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
        orderValue: 1,
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C916227_FolioInstance');

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
            // Create initial item for Holdings A
            cy.createItem({
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsAId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: testData.orderValue,
            });
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
        'C916227 Create 2nd Item in Holdings after 1st Item was moved to another Holdings (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C916227'],
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
            fromHolding: locationA.name,
            toHolding: locationB.name,
            shouldOpen: true,
            itemMoved: true,
            itemIndex: 0,
          });
          InventoryInstance.checkItemOrderValueInHoldings(
            locationB.name,
            0,
            testData.orderValue,
            true,
          );

          InventorySearchAndFilter.closeInstanceDetailPane();

          // Create new item for Holdings A with the same order value as the moved item
          cy.createItem({
            barcode: uuid(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            holdingsRecordId: holdingsAId,
            materialType: { id: materialType.id },
            permanentLoanType: { id: loanType.id },
            order: testData.orderValue,
          }).then(({ status }) => {
            expect(status).to.equal(201);

            InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
            InventoryInstance.waitLoading();

            InventoryInstance.openHoldings(locationA.name);
            InventoryInstance.checkItemOrderValueInHoldings(
              locationA.name,
              0,
              testData.orderValue,
              false,
            );
          });
        },
      );
    });
  });
});
