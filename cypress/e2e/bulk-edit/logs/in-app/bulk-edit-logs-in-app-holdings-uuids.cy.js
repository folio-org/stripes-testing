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
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameValid = `Matched-Records-${validHoldingUUIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${validHoldingUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validHoldingUUIDsFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
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

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
        FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          validHoldingUUIDsFileName,
          `*${matchedRecordsFileNameValid}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C375289 Verify generated Logs files for Holdings In app -- only valid Holdings UUIDs (firebird)',
        { tags: ['smoke', 'firebird', 'C375289'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
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
          ExportFile.verifyFileIncludes(`*${matchedRecordsFileNameValid}`, [uuid]);

          BulkEditLogs.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [
            `${permLocation},${tempLocation}`,
          ]);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
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
});
