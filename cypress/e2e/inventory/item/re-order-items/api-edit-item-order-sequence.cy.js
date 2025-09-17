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
      const instanceTitlePrefix = `AT_C808483_FolioInstance_${randomPostfix}`;
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808483_FolioInstance');

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
          // Create instance with holdings
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
        'C808483 API | Edit "Item" with duplicated / last in the sequence / out of the sequence "order" value (spitfire)',
        {
          tags: [],
        },
        () => {
          cy.getToken(user.username, user.password);
          // Use the 5th item (last one) for editing
          const fifthItem = createdItems[4];

          // Step 1: Update item to have duplicated order value (1)
          cy.getItems({ query: `id=="${fifthItem.id}"` }).then((item) => {
            const originalItem = item;
            const updatedItemBody = {
              ...originalItem,
              order: 1, // Duplicate of first item's order
            };
            InventoryItems.editItemViaApi(updatedItemBody).then((response) => {
              expect(response.status).to.eq(204);
            });
          });

          // Step 2: Verify items are sorted by order field and duplicates exist
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 1, 2, 3, 4]);
          });

          // Step 3: Update item to have last in sequence order value (5)
          cy.getItems({ query: `id=="${fifthItem.id}"` }).then((item) => {
            const currentItem = item;
            const updatedItemBody = {
              ...currentItem,
              order: 5, // Last in sequence
            };
            InventoryItems.editItemViaApi(updatedItemBody).then((response) => {
              expect(response.status).to.eq(204);
            });
          });

          // Step 4: Verify items are sorted correctly (1, 2, 3, 4, 5)
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3, 4, 5]);
          });

          // Step 5: Update item to have out of sequence order value (1230)
          cy.getItems({ query: `id=="${fifthItem.id}"` }).then((item) => {
            const currentItem = item;
            const updatedItemBody = {
              ...currentItem,
              order: 1230, // Out of sequence
            };
            InventoryItems.editItemViaApi(updatedItemBody).then((response) => {
              expect(response.status).to.eq(204);
            });
          });

          // Step 6: Verify final order sequence (1, 2, 3, 4, 1230)
          cy.log('Step 6: Verify final order sequence 1, 2, 3, 4, 1230');
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3, 4, 1230]);
          });
        },
      );
    });
  });
});
