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
      const instanceTitlePrefix = `AT_C808484_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808484_FolioInstance');

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
          // Create instance with multiple holdings
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsARecordId = testData.folioInstances[0].holdings[0].id;
          holdingsBRecordId = testData.folioInstances[0].holdings[1].id;

          // Create 3 items for Holdings A with order values 1, 2, 3
          const holdingsAOrderValues = [1, 2, 3];
          holdingsAOrderValues.forEach((orderValue) => {
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
          const holdingsBOrderValues = [1, 2, 3, 4, 5];
          holdingsBOrderValues.forEach((orderValue) => {
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
        'C808484 API | Edit "Item" with empty "order" field when Instance has multiple Holdings with Items (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C808484'],
        },
        () => {
          const secondItem = holdingsAItems[1];
          const thirdItem = holdingsAItems[2];

          // Step 1: Update 3rd item in Holdings A without order field
          cy.getItems({ query: `id=="${thirdItem.id}"` }).then((item) => {
            const originalItem = item;
            const updatedItemBody = {
              ...originalItem,
            };
            delete updatedItemBody.order;
            InventoryItems.editItemViaApi(updatedItemBody).then((response) => {
              expect(response.status).to.eq(204);
            });
          });

          // Step 2: Verify Holdings A order sequence is now 1, 2, 4
          InventoryItems.getItemsInHoldingsViaApi(holdingsARecordId).then((items) => {
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 4]);
          });

          // Step 3: Update 2nd item in Holdings A without order field
          cy.getItems({ query: `id=="${secondItem.id}"` }).then((item) => {
            const currentItem = item;
            const updatedItemBody = {
              ...currentItem,
            };
            // Remove the order field to test empty order behavior
            delete updatedItemBody.order;
            InventoryItems.editItemViaApi(updatedItemBody).then((response) => {
              expect(response.status).to.eq(204);
            });
          });

          // Step 4: Verify Holdings A order sequence is now 1, 4, 5
          InventoryItems.getItemsInHoldingsViaApi(holdingsARecordId).then((items) => {
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 4, 5]);
          });
        },
      );
    });
  });
});
