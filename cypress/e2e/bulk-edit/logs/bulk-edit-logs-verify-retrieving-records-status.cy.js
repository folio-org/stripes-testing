import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
let materialTypeId;
const itemCount = 150;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const instance = {
  title: `AT_C651436_Instance_${getRandomPostfix()}`,
  instanceId: null,
  holdingId: null,
  itemIds: [],
  itemBarcodes: [],
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.getAdminToken();

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.title,
            },
          }).then((createdInstanceData) => {
            instance.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: instance.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              instance.holdingId = holding.id;

              // Create 150 items to ensure "Retrieving records" status is catchable
              for (let i = 0; i < itemCount; i++) {
                const barcode = `item_${i}_${getRandomPostfix()}`;
                instance.itemBarcodes.push(barcode);

                InventoryItems.createItemViaApi({
                  barcode,
                  holdingsRecordId: instance.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
              }
            });
          });
        });

        cy.then(() => {
          FileManager.createFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            instance.itemBarcodes.join('\n'),
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      instance.itemIds.forEach((id) => {
        InventoryItems.deleteItemViaApi(id);
      });

      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C651436 Verify records with "Retrieving records" status are correctly labeled in Bulk edit Logs (firebird)',
      { tags: ['extendedPath', 'firebird', 'C651436'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button and "Item barcodes" identifier
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload a .csv file with valid Item barcodes
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);

        // Step 3: Immediately switch to Logs to catch "Retrieving records" status
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkLogsCheckbox('Retrieving records');
        BulkEditLogs.verifyLogResultsFound();
        BulkEditLogs.verifyCellsValues(2, 'Retrieving records');
        BulkEditLogs.verifyLogStatus(user.username, 'Retrieving records');
      },
    );
  });
});
