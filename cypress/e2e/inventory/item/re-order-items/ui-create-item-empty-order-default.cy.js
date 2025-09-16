import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808496_FolioInstance_${randomPostfix}`;
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
      const createdItemBarcodes = [];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808496_FolioInstance');

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
        'C808496 Create "Item" with empty "order" field (default state) (spitfire)',
        {
          tags: [],
        },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();

          // Navigate to the instance
          InventoryInstances.searchByTitle(testData.folioInstances[0].instanceId);
          InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();

          // Step 1: Add first item record to holdings
          const firstItemBarcode = `AT_C808496_Item1_${uuid()}`;
          createdItemBarcodes.push(firstItemBarcode);

          InventoryInstance.addItem();
          ItemRecordNew.waitLoading(instanceTitlePrefix);
          ItemRecordNew.fillItemRecordFields({
            barcode: firstItemBarcode,
            materialType: materialType.name,
            loanType: loanType.name,
          });
          // Note: Not filling order field to test default auto-assignment
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 3: Add second item record to holdings
          const secondItemBarcode = `AT_C808496_Item2_${uuid()}`;
          createdItemBarcodes.push(secondItemBarcode);

          InventoryInstance.addItem();
          ItemRecordNew.waitLoading(instanceTitlePrefix);
          ItemRecordNew.fillItemRecordFields({
            barcode: secondItemBarcode,
            materialType: materialType.name,
            loanType: loanType.name,
          });
          // Note: Not filling order field to test default auto-assignment
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 6: Expand holdings accordion
          InventoryInstance.openHoldingsAccordion(`${location.name} >`);

          // Step 7: Verify order field values via API call
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            const firstItem = items.find((item) => item.barcode === createdItemBarcodes[0]);
            const secondItem = items.find((item) => item.barcode === createdItemBarcodes[1]);

            expect(items).to.have.length(2);
            expect(firstItem.order).to.equal(1);
            expect(secondItem.order).to.equal(2);
          });
        },
      );
    });
  });
});
