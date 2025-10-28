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
      const instanceTitlePrefix = `AT_C825233_FolioInstance_${randomPostfix}`;
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C825233_FolioInstance');

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
        Users.deleteViaApi(user.userId);
      });

      it(
        'C825233 API | Update "order" of multiple "Item" records (specified "order" field) for same holdings using batch endpoint (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C825233'] },
        () => {
          cy.getToken(user.username, user.password);

          const itemsToUpdateFirst = [];
          const itemsToUpdateSecond = [];
          const newOrdersFirst = [10, 11, null, 13, 13];
          const newOrdersSecond = [5, 4, 3, 2, 1];

          // First update
          createdItems.forEach((item, index) => {
            itemsToUpdateFirst.push({
              id: item.id,
              _version: item._version,
            });
            if (newOrdersFirst[index]) itemsToUpdateFirst[index].order = newOrdersFirst[index];
          });

          // Use the batch update API endpoint
          cy.batchUpdateItemsPatchViaApi(itemsToUpdateFirst).then((response) => {
            expect(response.status).to.eq(204);
          });

          // Step 2: Verify items are sorted by order field
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence: 3, 10, 11, 13, 13
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([3, 10, 11, 13, 13]);
          });

          // Second update
          createdItems.forEach((item, index) => {
            itemsToUpdateSecond.push({
              id: item.id,
              _version: `${+item._version + 1}`,
              order: newOrdersSecond[index],
            });
          });

          // Use the batch update API endpoint
          cy.batchUpdateItemsPatchViaApi(itemsToUpdateSecond).then((response) => {
            expect(response.status).to.eq(204);
          });

          // Step 4: Verify items are sorted by order field
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            // Verify order field sequence: 1, 2, 3, 4, 5
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal(newOrdersSecond.sort());
          });
        },
      );
    });
  });
});
