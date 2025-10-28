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
      const instanceTitlePrefix = `AT_C825240_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 2,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        originalOrders: [1, 2, 3, 4, 5],
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsARecordId;
      let holdingsBRecordId;
      const holdingsAItems = [];
      const holdingsBItems = [];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825240_FolioInstance');

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
          holdingsARecordId = testData.folioInstances[0].holdings[0].id;
          holdingsBRecordId = testData.folioInstances[1].holdings[0].id;

          // Create 3 items for Holdings A with order values 1, 2, 3, 4, 5
          testData.originalOrders.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsARecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            }).then((response) => {
              holdingsAItems.push(response.body);
            });
          });

          // Create 5 items for Holdings B with order values 1, 2, 3, 4, 5
          testData.originalOrders.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsBRecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            }).then((response) => {
              holdingsBItems.push(response.body);
            });
          });
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.inventoryStorageBatchUpdateItemsPatch.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[0].instanceId,
        );
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[1].instanceId,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C825240 API | Update "order" of multiple "Item" records (specified "order" field) for different holdings of different Instances using batch endpoint (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C825240'] },
        () => {
          cy.getToken(user.username, user.password);

          const itemDataForUpdate = [];
          const ordersForUpdate = [6, 8, 10, 11, 12];

          [
            holdingsAItems[0],
            holdingsAItems[2],
            holdingsBItems[0],
            holdingsBItems[1],
            holdingsBItems[4],
          ].forEach((item, index) => {
            itemDataForUpdate.push({
              id: item.id,
              _version: item._version,
              order: ordersForUpdate[index],
            });
          });

          // Use the batch update API endpoint
          cy.batchUpdateItemsPatchViaApi(itemDataForUpdate).then((response) => {
            expect(response.status).to.eq(204);
          });

          // Step 2: Verify order updates for Holdings A items
          InventoryItems.getItemsInHoldingsViaApi(holdingsARecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([2, 4, 5, 6, 8]);
          });

          // Step 3: Verify order updates for Holdings B items
          InventoryItems.getItemsInHoldingsViaApi(holdingsBRecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([3, 4, 10, 11, 12]);
          });
        },
      );
    });
  });
});
