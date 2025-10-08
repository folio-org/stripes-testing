import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808501_FolioInstance_${randomPostfix}`;
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
      let item2Barcode;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808501_FolioInstance');

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

          // Create 5 items with order sequence 1, 2, 3, 4, 5
          for (let i = 1; i <= 5; i++) {
            const itemBarcode = `AT_C808501_Item${i}_${uuid()}`;
            if (i === 2) {
              item2Barcode = itemBarcode; // Store the 2nd item barcode for deletion
            }
            cy.createItem({
              barcode: itemBarcode,
              order: i,
              holdingsRecordId,
              materialType: { id: materialType.id },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: loanType.id },
            });
          }
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditDeleteItems.gui,
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
      it.skip('C808501 Delete "Item" with filled "order" field (spitfire)', { tags: [] }, () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Navigate to instance with holdings containing 5 items with order sequence 1, 2, 3, 4, 5
        InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
        InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
        InventoryInstance.waitLoading();

        // Open Holdings accordion and navigate to the 2nd item (with order field "2")
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcode(item2Barcode);
        ItemRecordView.waitLoading();

        // Step 1: Delete "Item" record - Click Actions >> Delete option and confirm deletion
        const confirmDeleteModal = ItemRecordView.clickDeleteButton();
        confirmDeleteModal.waitLoading();
        confirmDeleteModal.clickDeleteButton();

        // Expected Result: User is on detail view pane of "Instance" record
        InventoryInstance.waitLoading();

        // Step 3: Expand "Holdings" accordion and verify order field sequence
        InventoryInstance.openHoldingsAccordion(location.name);

        // Verify deleted item record has been deleted and sequence of "order" field is 1, 3, 4, 5
        InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
          // Should have 4 items remaining (deleted the item with order 2)
          expect(items).to.have.length(4);

          // Verify order sequence is 1, 3, 4, 5 (order values are not renumbered after deletion)
          const orderValues = items.map((item) => item.order);
          expect(orderValues).to.deep.equal([1, 3, 4, 5]);

          // Verify the deleted item (with order 2) is not present
          const deletedItem = items.find((item) => item.barcode === item2Barcode);
          expect(deletedItem).to.equal(undefined);
        });
      });
    });
  });
});
