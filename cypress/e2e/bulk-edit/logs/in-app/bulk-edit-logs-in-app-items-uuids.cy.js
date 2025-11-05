import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let validItemUUIDsFileName;
let fileNames;
let item;

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
          validItemUUIDsFileName = `validItemUUIDs_${getRandomPostfix()}.csv`;
          fileNames = BulkEditFiles.getAllDownloadedFileNames(validItemUUIDsFileName);
          item = {
            instanceName: `testBulkEdit_${getRandomPostfix()}`,
            itemBarcode: getRandomPostfix(),
            accessionNumber: getRandomPostfix(),
            instanceId: '',
            itemId: '',
          };

          cy.createTempUser([
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.bulkEditLogsView.gui,
            permissions.inventoryAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            item.instanceId = InventoryInstances.createInstanceViaApi(
              item.instanceName,
              item.itemBarcode,
            );

            cy.getItems({
              limit: 1,
              expandAll: true,
              query: `"barcode"=="${item.itemBarcode}"`,
            }).then((res) => {
              item.itemId = res.id;
              FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, res.id);
            });

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });

        afterEach('delete test data', () => {
          cy.getAdminToken();
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
          Users.deleteViaApi(user.userId);
          FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(validItemUUIDsFileName);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });

        it(
          'C375273 Verify generated Logs files for Items In app -- only valid Item UUIDs (firebird)',
          { tags: ['smoke', 'firebird', 'C375273'] },
          () => {
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

            BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.downloadMatchedResults();

            const newLocation = 'Online';

            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.replaceTemporaryLocation(newLocation, 'item', 0);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replacePermanentLocation(newLocation, 'item', 1);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.AVAILABLE, 2);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.fillTemporaryLoanType('Reading room', 3);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.fillPermanentLoanType('Selected', 4);
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
            BulkEditFiles.verifyCSVFileRows(validItemUUIDsFileName, [item.itemId]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.matchedRecordsCSV,
              [item.itemId],
              'firstElement',
              true,
            );

            BulkEditLogs.downloadFileWithProposedChanges();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.previewRecordsCSV,
              [item.itemId],
              'firstElement',
              true,
            );

            BulkEditLogs.downloadFileWithUpdatedRecords();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.changedRecordsCSV,
              [item.itemId],
              'firstElement',
              true,
            );

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.closeDetailView();
            InventoryInstance.openHoldings(['']);
            InventoryInstance.verifyCellsContent(
              newLocation,
              ITEM_STATUS_NAMES.AVAILABLE,
              'Reading room',
            );
          },
        );
      });
    });
  },
);
