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
      const instanceTitlePrefix = `AT_C808482_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        errorMessage: 'Order should be a number',
        invalidOrderValues: ['s', '%', '1a', '1!', '09'],
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordId;
      let createdItem;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808482_FolioInstance');

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
          // Create instance with holdings
        }).then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;

          // Create a single item that will be used for editing tests
          cy.createItem({
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            holdingsRecordId,
            barcode: uuid(),
            materialType: { id: materialType.id },
            permanentLoanType: { id: loanType.id },
            order: 1,
          }).then((response) => {
            const itemId = response.body.id;

            // Get the complete item body using the inventory API
            cy.getItems({ query: `id==${itemId}` }).then((itemData) => {
              createdItem = itemData;
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
        'C808482 API | "order" field validation in edit "Item" request (spitfire)',
        { tags: [] },
        () => {
          cy.getToken(user.username, user.password);

          // Test each invalid order value using cycle
          testData.invalidOrderValues.forEach((invalidOrderValue) => {
            // Create a copy of the original item body and modify the order field
            const itemBodyToEdit = {
              ...createdItem,
              order: invalidOrderValue,
            };

            // Attempt to edit the item with invalid order value
            InventoryItems.editItemViaApi(itemBodyToEdit, true).then((response) => {
              expect(response.status).to.eq(422);
              expect(response.body.errors[0].message).to.equal(testData.errorMessage);
            });
          });
        },
      );
    });
  });
});
