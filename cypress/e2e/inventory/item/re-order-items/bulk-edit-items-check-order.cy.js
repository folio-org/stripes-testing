import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C812851_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
      };
      const itemBarcodesFileName = `itemBarcodes_C812851_${randomPostfix}.csv`;
      const itemBarcodes = [];
      const locations = [];

      let user;
      let materialType;
      let loanType;
      let holdingsRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C812851_');

        cy.then(() => {
          cy.getLocations({
            limit: 2,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then(() => {
            locations.push(...Cypress.env('locations'));
          });
          cy.getLoanTypes({ limit: 1, query: '(name<>"AT_*" and name<>"*auto*")' }).then(
            (loanTypes) => {
              loanType = loanTypes[0];
            },
          );
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location: locations[0],
            });
            holdingsRecordId = testData.folioInstances[0].holdings[0].id;

            for (let i = 1; i <= 5; i++) {
              const itemBarcode = `at_c812851_item${i}_${randomPostfix}`;
              itemBarcodes.push(itemBarcode);
              cy.createItem({
                barcode: itemBarcode,
                order: i,
                holdingsRecordId,
                materialType: { id: materialType.id },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanType.id },
              });
            }
          })
          .then(() => {
            // Create CSV file with barcodes of items 2-5 (4 items)
            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              itemBarcodes.slice(1).join('\n'),
            );
          });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.bulkEditView.gui,
          Permissions.bulkEditEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[0].instanceId,
        );
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C812851 Update multiple "Item" records of same "Holdings" via "Bulkedit" and check "order" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C812851'] },
        () => {
          cy.getToken(user.username, user.password);
          // Step 2: Verify initial order field sequence is 1, 2, 3, 4, 5 via API
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3, 4, 5]);
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 3: Run bulk edit - replace temporary location for items 2-5 (4 items)
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneRecordsCount('4 item');

          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.replaceTemporaryLocation(locations[1].name, 'item', 0);
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(...itemBarcodes.slice(1));
          BulkEditSearchPane.waitFileUploading();

          // Step 4: Navigate to Inventory and open the instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventoryInstances.selectInstanceById(testData.folioInstances[0].instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 6: Verify order field has not changed after bulk edit (sequence must be: 1, 2, 3, 4, 5)
          InventoryInstance.openHoldingsAccordion(locations[0].name);
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 2, 3, 4, 5]);
          });
        },
      );
    });
  });
});
