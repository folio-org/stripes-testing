import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
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
      const instanceTitlePrefix = `AT_C808500_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        testTag: { label: `at_c808500_tag_${randomPostfix}` },
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808500_FolioInstance');

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
          cy.createTagApi(testData.testTag).then((tagId) => {
            testData.testTag.id = tagId;
          });
        }).then(() => {
          // Create instance with holdings
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;

          // Create 3 items with order sequence 1, 2, 3
          for (let i = 1; i <= 3; i++) {
            cy.createItem({
              barcode: uuid(),
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
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.uiInventoryMarcItemInProcessDefault.gui,
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
        cy.deleteTagApi(testData.testTag.id);
      });

      // Trillium+ only
      it('C808500 Edit "Item" with filled "order" field (spitfire)', { tags: [] }, () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Navigate to instance with holdings containing items with order sequence 1, 2, 3
        InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
        InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
        InventoryInstance.waitLoading();

        // Get items via API to find the one with order 2
        cy.getItems({
          query: `holdingsRecordId=="${holdingsRecordId}" and order=2`,
          limit: 1,
        }).then((item2) => {
          const originalBarcode = item2.barcode;

          // Step 1: Open item with order 2 and edit it
          InventoryInstance.openHoldingsAccordion(location.name);
          InventoryInstance.openItemByBarcode(originalBarcode);
          ItemRecordView.waitLoading();

          // Edit item - update barcode only
          const newBarcode = `AT_C808500_Updated_${uuid()}`;
          ItemRecordView.openItemEditForm(testData.folioInstances[0].instanceTitle);
          ItemRecordEdit.fillItemRecordFields({
            barcode: newBarcode,
          });
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();

          // Step 2: Go back to Instance detail view
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();

          // Step 4: Expand Holdings accordion and verify order field unchanged
          InventoryInstance.openHoldingsAccordion(location.name);

          // Verify order sequence is still 1, 2, 3 via API
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((allItems) => {
            const orderValues = allItems.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3]);
            const updatedItem = allItems.find((item) => item.barcode === newBarcode);
            expect(updatedItem.order).to.equal(2);
          });

          // Step 5: Open the 2nd item record again (now with updated barcode)
          InventoryInstance.openItemByBarcode(newBarcode);
          ItemRecordView.waitLoading();

          // Step 6: Update item status to "In process"
          InventoryItems.markAsInProcess(false);
          ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

          // Step 7: Go back to Instance detail view
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();

          // Step 8: Verify order field still unchanged after status update
          InventoryInstance.openHoldingsAccordion(location.name);
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((allItems) => {
            const orderValues = allItems.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3]);
            const updatedItem = allItems.find((item) => item.barcode === newBarcode);
            expect(updatedItem.order).to.equal(2);
          });

          // Step 9: Open the 2nd item record for tag assignment
          InventoryInstance.openItemByBarcode(newBarcode);
          ItemRecordView.waitLoading();

          // Step 10: Add tag to item record
          ItemRecordView.toggleTagsAccordion(true);
          ItemRecordView.addTag(testData.testTag.label);

          // Step 11: Go back to Instance detail view
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();

          // Step 12: Final verification - order field still unchanged after tag addition
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((allItems) => {
            const orderValues = allItems.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3]);
            const updatedItem = allItems.find((item) => item.barcode === newBarcode);
            expect(updatedItem.order).to.equal(2);
          });
        });
      });
    });
  });
});
