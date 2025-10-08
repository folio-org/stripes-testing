import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import Users from '../../../../support/fragments/users/users';
import { Permissions } from '../../../../support/dictionary';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808499_FolioInstance_${randomPostfix}`;
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

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808499_FolioInstance');

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
      it.skip(
        'C808499 User can duplicate an item that has a filled order field and the duplicated item order field will use the next order value (spitfire)',
        { tags: [] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();

          // Navigate to instance that has holdings with multiple items with order fields 1, 2, 3
          InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();

          // Get items via API to find the one with order 2
          cy.getItems({
            query: `holdingsRecordId=="${holdingsRecordId}" and order=2`,
            limit: 1,
          }).then((item) => {
            const itemWithOrder2 = item;

            // Open the item with order field value 2
            InventoryInstance.openHoldingsAccordion(location.name);
            InventoryInstance.openItemByBarcode(itemWithOrder2.barcode);

            // Duplicate the item
            ItemRecordView.duplicateItem();
            ItemRecordNew.waitLoading(testData.folioInstances[0].instanceTitle);

            // Update the barcode of the duplicated item
            const duplicatedItemBarcode = `AT_C808499_Item_${uuid()}`;
            ItemRecordNew.addBarcode(duplicatedItemBarcode);

            // Save the duplicated item
            ItemRecordNew.saveAndClose({ itemSaved: true });

            // Step 5: Verify the duplicated item has order field value 4 (continues the sequence)
            ItemRecordView.waitLoading();

            // Navigate back to instance and open holdings
            ItemRecordView.closeDetailView();
            InventoryInstance.waitLoading();
            InventoryInstance.openHoldingsAccordion(location.name);

            // Verify all items have correct order values via API
            // Will fail until fixed in UIIN-3486
            InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
              const orderValues = items.map((it) => it.order);
              expect(orderValues).to.deep.equal([1, 2, 3, 4]);
              const duplicatedItem = items.find((it) => it.barcode === duplicatedItemBarcode);
              expect(duplicatedItem.order).to.equal(4);
            });
          });
        },
      );
    });
  });
});
