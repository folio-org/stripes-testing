import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
let uuid;
let validHoldingUUIDsFileName;
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
          validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
          fileNames = BulkEditFiles.getAllDownloadedFileNames(validHoldingUUIDsFileName, true);
          item = {
            instanceName: `testBulkEdit_${getRandomPostfix()}`,
            itemBarcode: getRandomPostfix(),
          };

          cy.createTempUser([
            permissions.bulkEditLogsView.gui,
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.inventoryAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            const instanceId = InventoryInstances.createInstanceViaApi(
              item.instanceName,
              item.itemBarcode,
            );
            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instanceId}"`,
            }).then((holdings) => {
              uuid = holdings[0].id;
              FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, uuid);
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
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
          FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });

        it(
          'C375289 Verify generated Logs files for Holdings In app -- only valid Holdings UUIDs (firebird)',
          { tags: ['smoke', 'firebird', 'C375289'] },
          () => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Holdings',
              'Holdings UUIDs',
            );
            BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();

            BulkEditActions.downloadMatchedResults();
            BulkEditActions.openInAppStartBulkEditFrom();

            const tempLocation = 'Annex';
            const permLocation = 'Main Library';

            BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings', 0);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replacePermanentLocation(permLocation, 'holdings', 1);

            BulkEditActions.confirmChanges();
            BulkEditActions.downloadPreview();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkHoldingsCheckbox();
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenCompleted();

            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(validHoldingUUIDsFileName, [uuid]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [uuid]);

            BulkEditLogs.downloadFileWithProposedChanges();
            ExportFile.verifyFileIncludes(fileNames.previewRecordsCSV, [
              `${permLocation},${tempLocation}`,
            ]);

            BulkEditLogs.downloadFileWithUpdatedRecords();
            ExportFile.verifyFileIncludes(fileNames.changedRecordsCSV, [
              `${permLocation},${tempLocation}`,
            ]);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.byKeywords(uuid);
            InventorySearchAndFilter.selectSearchResultItem();
            InventorySearchAndFilter.selectViewHoldings();
            InventoryInstance.verifyHoldingsPermanentLocation(permLocation);
            InventoryInstance.verifyHoldingsTemporaryLocation(tempLocation);
          },
        );
      });
    });
  },
);
