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
      const instanceTitlePrefix = `AT_C812850_FolioInstance_${randomPostfix}`;
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C812850_FolioInstance');

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

      // Trillium+ only
      it(
        'C812850 API | Edit multiple "Item" records (change "order" field values) using batch endpoint (spitfire)',
        {
          tags: [],
        },
        () => {
          cy.getToken(user.username, user.password);

          // Step 1: Update all 5 items using batch endpoint with specific order values
          const updateOrderData = [{ order: 10 }, { order: 11 }, {}, { order: 13 }, { order: 13 }];

          const itemsToUpdate = [];

          createdItems.forEach((item, index) => {
            const config = updateOrderData[index];
            const updatedItemData = {
              id: item.id,
              _version: item._version,
              holdingsRecordId: item.holdingsRecordId,
              barcode: uuid(),
              status: {
                name: ITEM_STATUS_NAMES.AVAILABLE,
              },
              materialTypeId: materialType.id,
              permanentLoanTypeId: loanType.id,
            };

            if (config.order !== undefined) {
              updatedItemData.order = config.order;
            }

            itemsToUpdate.push(updatedItemData);
          });

          cy.batchUpdateItemsViaApi(itemsToUpdate).then((response) => {
            expect(response.status).to.eq(201);
          });

          // Step 2: Verify items are sorted by order field with sequence 10, 11, 12, 13, 13
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence: 10, 11, 12, 13, 13
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([10, 11, 12, 13, 13]);
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
