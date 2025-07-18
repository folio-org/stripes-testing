import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let validHoldingUUIDsFileName;
let fileNames;
let inventoryEntity;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Logs', () => {
      describe('In-app approach', () => {
        beforeEach('create test data', () => {
          validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
          fileNames = BulkEditFiles.getAllDownloadedFileNames(validHoldingUUIDsFileName, true);
          inventoryEntity = {
            instance: {
              id: '',
              name: `testBulkEdit_${getRandomPostfix()}`,
            },
            item: {
              id: '',
              id2: '',
              barcode: getRandomPostfix(),
            },
            holdingId: '',
            locations: {
              permanent: {
                id: '',
                name: '',
              },
            },
          };

          cy.createTempUser([
            permissions.bulkEditLogsView.gui,
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.inventoryAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            inventoryEntity.instance.id = InventoryInstances.createInstanceViaApi(
              inventoryEntity.instance.name,
              inventoryEntity.item.barcode,
            );
            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${inventoryEntity.instance.id}"`,
            }).then((holdings) => {
              inventoryEntity.holdingId = holdings[0].id;
              inventoryEntity.locations.permanent.id = holdings[0].permanentLocationId;
              FileManager.createFile(
                `cypress/fixtures/${validHoldingUUIDsFileName}`,
                inventoryEntity.holdingId,
              );

              cy.getLocations({
                limit: 1,
                query: `id="${inventoryEntity.locations.permanent.id}"`,
              }).then((loc) => {
                inventoryEntity.locations.permanent.name = loc.name;
              });
              cy.getItems({ query: `"barcode"=="${inventoryEntity.item.barcode}"` }).then(
                (inventoryItem) => {
                  inventoryEntity.item.id = inventoryItem.id;
                },
              );
              cy.getItems({
                query: `"barcode"=="secondBarcode_${inventoryEntity.item.barcode}"`,
              }).then((inventoryItem) => {
                inventoryEntity.item.id2 = inventoryItem.id;
              });
            });
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });

        afterEach('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
            inventoryEntity.item.barcode,
          );
          FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(validHoldingUUIDsFileName);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });

        it(
          'C375288 Verify generated Logs files for Items In app -- only valid Holdings UUIDs (firebird)',
          { tags: ['smoke', 'firebird', 'C375288'] },
          () => {
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

            BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.downloadMatchedResults();
            BulkEditActions.openInAppStartBulkEditFrom();

            BulkEditActions.clearTemporaryLocation();
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replacePermanentLocation(
              inventoryEntity.locations.permanent.name,
              'item',
              1,
            );
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.AVAILABLE, 2);

            BulkEditActions.confirmChanges();
            BulkEditActions.downloadPreview();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkItemsCheckbox();
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenCompleted();

            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(validHoldingUUIDsFileName, [inventoryEntity.holdingId]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [
              inventoryEntity.item.id,
              inventoryEntity.item.id2,
            ]);

            BulkEditLogs.downloadFileWithProposedChanges();
            ExportFile.verifyFileIncludes(fileNames.previewRecordsCSV, [
              '',
              `${inventoryEntity.locations.permanent.name} > 1,`,
              `${inventoryEntity.locations.permanent.name} > 1,`,
              '',
            ]);

            BulkEditLogs.downloadFileWithUpdatedRecords();
            ExportFile.verifyFileIncludes(fileNames.changedRecordsCSV, [
              '',
              `${inventoryEntity.locations.permanent.name} > 1,`,
              `${inventoryEntity.locations.permanent.name} > 1,`,
              '',
            ]);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.item.barcode);
            ItemRecordView.checkItemDetails(
              inventoryEntity.locations.permanent.name,
              inventoryEntity.item.barcode,
              ITEM_STATUS_NAMES.AVAILABLE,
            );
          },
        );
      });
    });
  },
);
