import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808495_FolioInstance_${randomPostfix}`;
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
      const createdItemIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808495_FolioInstance');

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

      // Trillium+ only
      it(
        'C808495 API | Create multiple "Item" records with filled "order" field using batch endpoint (spitfire)',
        {
          tags: [],
        },
        () => {
          cy.getToken(user.username, user.password);

          // Step 1: Create multiple items with filled order fields (including duplicates and one empty)
          const otemOrderData = [
            { order: 5 }, // Item 1: order = 5
            { order: 5 }, // Item 2: order = 5 (duplicate)
            {}, // Item 3: no order field (empty)
            { order: 3 }, // Item 4: order = 3
            { order: 2 }, // Item 5: order = 2
          ];

          const itemsToCreate = [];

          otemOrderData.forEach((config) => {
            const itemId = uuid();
            createdItemIds.push(itemId);

            const itemData = {
              id: itemId,
              holdingsRecordId,
              barcode: itemId,
              status: {
                name: ITEM_STATUS_NAMES.AVAILABLE,
              },
              materialTypeId: materialType.id,
              permanentLoanTypeId: loanType.id,
            };

            // Add order field only if specified in config
            if (config.order !== undefined) {
              itemData.order = config.order;
            }

            itemsToCreate.push(itemData);
          });

          cy.batchCreateItemsViaApi(itemsToCreate).then((response) => {
            expect(response.status).to.eq(201);
          });
          // Step 2: Verify items are sorted by order field with sequence 2, 3, 5, 5, 6
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);

            // Verify order field sequence: 2, 3, 5, 5, 6
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([2, 3, 5, 5, 6]);

            // Verify all created items are present
            const returnedItemIds = items.map((item) => item.id);
            createdItemIds.forEach((itemId) => {
              expect(returnedItemIds).to.include(itemId);
            });
          });
        },
      );
    });
  });
});
