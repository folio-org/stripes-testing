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
      const instanceTitlePrefix = `AT_C808494_FolioInstance_${randomPostfix}`;
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808494_FolioInstance');

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

      it(
        'C808494 API | Create multiple "Item" records with empty "order" field using batch endpoint (spitfire)',
        {
          tags: ['criticalPath', 'spitfire', 'C808494'],
        },
        () => {
          cy.getToken(user.username, user.password);

          // Step 1: Create multiple items without order field using batch endpoint
          const itemsToCreate = [];

          // Create 5 items without order field
          for (let i = 1; i <= 5; i++) {
            const itemId = uuid();
            createdItemIds.push(itemId);

            itemsToCreate.push({
              id: itemId,
              holdingsRecordId,
              barcode: itemId,
              status: {
                name: ITEM_STATUS_NAMES.AVAILABLE,
              },
              materialTypeId: materialType.id,
              permanentLoanTypeId: loanType.id,
              // Intentionally omitting order field to test auto-assignment
            });
          }

          // Use the batch create API endpoint
          cy.batchCreateItemsViaApi(itemsToCreate).then((response) => {
            expect(response.status).to.eq(201);
          });

          // Step 2: Verify items are sorted by order field with sequence 1, 2, 3, 4, 5
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);

            // Verify order field is auto-assigned with proper sequence
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3, 4, 5]);

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
