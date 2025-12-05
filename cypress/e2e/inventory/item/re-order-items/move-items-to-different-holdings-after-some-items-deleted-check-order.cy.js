import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C916233_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
        initialHoldingsAOrders: [1, 2],
        initialHoldingsBOrder: 3,
      };
      const itemToMoveBarcode = uuid();

      let user;
      let locationA;
      let locationB;
      let materialType;
      let loanType;
      let holdingsAId;
      let holdingsBId;
      const initialHoldingsAItemIds = [];
      let newHoldingsAItemId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C916233');

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
              cy.updateHoldingRecord(holdingsBId, {
                ...holdings[0],
                permanentLocationId: locationB.id,
              });
            });
          })
          .then(() => {
            testData.initialHoldingsAOrders.forEach((order) => {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsAId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                order,
              }).then(({ body }) => {
                initialHoldingsAItemIds.push(body.id);
              });
            });
            cy.createItem({
              barcode: itemToMoveBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsBId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: testData.initialHoldingsBOrder,
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditDeleteItems.gui,
              Permissions.uiInventoryMoveItems.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
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
        'C916233 Create/Move 3rd Item in Holdings after only 2nd Item was deleted (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C916233'],
        },
        () => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
          InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();

          cy.then(() => {
            cy.deleteItemViaApi(initialHoldingsAItemIds[1]);
          })
            .then(() => {
              InventoryItems.getItemsInHoldingsViaApi(holdingsAId).then((items) => {
                expect(items).to.have.lengthOf(1);
              });
            })
            .then(() => {
              InventorySearchAndFilter.closeInstanceDetailPane();
              InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.openHoldings(locationA.name);
              InventoryInstance.checkItemOrderValueInHoldings(
                locationA.name,
                0,
                testData.initialHoldingsAOrders[0],
                false,
              );
            })
            .then(() => {
              cy.createItem({
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsAId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
              }).then(({ body }) => {
                newHoldingsAItemId = body.id;
              });
            })
            .then(() => {
              InventorySearchAndFilter.closeInstanceDetailPane();
              InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.openHoldings(locationA.name);
              InventoryInstance.checkItemOrderValueInHoldings(locationA.name, 1, 3, false);
            })
            .then(() => {
              cy.deleteItemViaApi(newHoldingsAItemId);
            })
            .then(() => {
              InventoryItems.getItemsInHoldingsViaApi(holdingsAId).then((items) => {
                expect(items).to.have.lengthOf(1);
              });
            })
            .then(() => {
              InventorySearchAndFilter.closeInstanceDetailPane();
              InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
              InventoryInstance.waitLoading();

              InventoryInstance.openMoveItemsWithinAnInstance();
              InventoryInstance.moveItemToAnotherHolding({
                fromHolding: locationB.name,
                toHolding: locationA.name,
                shouldOpen: true,
                itemMoved: true,
                itemIndex: 0,
              });
              InventoryInstance.checkItemOrderValueInHoldings(
                locationA.name,
                0,
                testData.initialHoldingsAOrders[0],
                true,
              );
              InventoryInstance.checkItemOrderValueInHoldings(locationA.name, 1, 4, true);
            });
        },
      );
    });
  });
});
