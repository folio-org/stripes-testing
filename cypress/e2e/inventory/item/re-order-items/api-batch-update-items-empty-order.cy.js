import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C812846_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordId;
      const createdItems = [];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C812846_FolioInstance');

        cy.then(() => {
          // Get required reference data
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
          }).then((res) => {
            location = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            loanType = loanTypes[0];
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
        }).then(() => {
          // Create instance with holdings (no items)
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;

          // Create 5 items with order values 1, 2, 3, 4, 5
          const orderValues = [1, 2, 3, 4, 5];
          orderValues.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            }).then((response) => {
              createdItems.push(response.body);
            });
          });
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.inventoryStorageBatchCreateUpdateItems.gui,
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
        'C812846 API | Edit multiple "Item" records (empty "order" field) using batch endpoint (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C812846'],
        },
        () => {
          cy.getToken(user.username, user.password);

          // Step 1: Update all 5 items using batch endpoint, removing order field
          const itemsToUpdate = [];

          createdItems.forEach((item) => {
            const updatedItemData = {
              id: item.id,
              _version: item._version,
              holdingsRecordId: item.holdingsRecordId,
              barcode: uuid(), // Updated unique barcode
              status: {
                name: ITEM_STATUS_NAMES.AVAILABLE,
              },
              materialTypeId: materialType.id,
              permanentLoanTypeId: loanType.id,
              // Intentionally omitting order field to test auto-assignment
            };

            itemsToUpdate.push(updatedItemData);
          });

          // Use the batch update API endpoint
          cy.batchUpdateItemsViaApi(itemsToUpdate).then((response) => {
            expect(response.status).to.eq(201);
          });

          // Step 2: Verify items are sorted by order field with sequence 6, 7, 8, 9, 10
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence: 6, 7, 8, 9, 10
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([6, 7, 8, 9, 10]);
            // Verify all original items are still present (by ID)
            const returnedItemIds = items.map((item) => item.id);
            createdItems.forEach((originalItem) => {
              expect(returnedItemIds).to.include(originalItem.id);
            });
          });
        },
      );
    });
  });
});
