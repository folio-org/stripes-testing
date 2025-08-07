import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let userJobHrid;
let holdingJobHrid;
let itemJobHrid;
let instanceJobHrid;
const folioInstance = {
  title: `AT_C423672_FolioInstance_${getRandomPostfix()}`,
  barcode: `item-${getRandomPostfix()}`,
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        folioInstance.instanceId = InventoryInstances.createInstanceViaApi(
          folioInstance.title,
          folioInstance.barcode,
        );

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${folioInstance.barcode}"`,
        }).then((instance) => {
          folioInstance.holdingId = instance.holdings[0].id;
          folioInstance.holdingHrid = instance.holdings[0].hrid;

          FileManager.createFile(
            `cypress/fixtures/${holdingUUIDsFileName}`,
            folioInstance.holdingId,
          );
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            folioInstance.instanceId,
          );
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, folioInstance.barcode);
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);

          cy.loginAsAdmin({
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          cy.intercept('POST', '/bulk-operations/*/start').as('userBulkOperations');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          cy.wait('@userBulkOperations').then(({ response }) => {
            userJobHrid = String(response.body.hrId);
          });
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(user.username);

          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
          cy.intercept('POST', '/bulk-operations/*/start').as('holdingBulkOperations');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          cy.wait('@holdingBulkOperations').then(({ response }) => {
            holdingJobHrid = String(response.body.hrId);
          });
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(folioInstance.holdingHrid);

          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
          cy.intercept('POST', '/bulk-operations/*/start').as('itemBulkOperations');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          cy.wait('@itemBulkOperations').then(({ response }) => {
            itemJobHrid = String(response.body.hrId);
          });
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(folioInstance.barcode);

          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          cy.intercept('POST', '/bulk-operations/*/start').as('instanceBulkOperations');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          cy.wait('@instanceBulkOperations').then(({ response }) => {
            instanceJobHrid = String(response.body.hrId);
          });
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditInstanceForm();
          BulkEditActions.addItemNote('Administrative note', 'adminNote');
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openLogsSearch();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioInstance.barcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(instanceUUIDsFileName);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C423672 User with "Bulk edit: Can view logs", "Bulk Edit: In app - View inventory records" and "Inventory: View, create, edit instances" permissions is able to view Inventory records Logs in "Bulk edit" (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423672'] },
      () => {
        // Step 1: Select "Inventory-holdings", "Inventory-instances", "Inventory-items", "Users" checkboxes
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.verifyLogResultsFound();
        BulkEditLogs.verifyLogsTableHeaders();

        // Step 2: Check the "Actions" column for Inventory records Logs
        // Verify that the Actions column exists in the table
        BulkEditLogs.clickActionsByJobHrid(holdingJobHrid);
        BulkEditLogs.clickActionsByJobHrid(itemJobHrid);

        // Step 3: Click on "..." icon for any "Inventory-instances" record Log
        // Find and click actions for inventory instances records
        BulkEditLogs.clickActionsByJobHrid(instanceJobHrid);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 4: Click any file hyperlink to download
        BulkEditLogs.downloadFileUsedToTrigger();
        ExportFile.verifyFileIncludes(instanceUUIDsFileName, [folioInstance.instanceId]);
        BulkEditLogs.downloadFileWithMatchingRecords();
        ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [folioInstance.instanceId]);
        BulkEditLogs.downloadFileWithProposedChanges();
        ExportFile.verifyFileIncludes(fileNames.previewRecordsCSV, [folioInstance.instanceId]);
        BulkEditLogs.downloadFileWithUpdatedRecords();
        ExportFile.verifyFileIncludes(fileNames.changedRecordsCSV, [folioInstance.instanceId]);

        // Step 5: Check the "Actions" column for Users records Logs
        // Verify Users records - actions should be absent for users based on permissions
        BulkEditLogs.verifyLogActionsButtonAbsentInARow(userJobHrid);

        // Step 6: Unselect checkboxes to filter to only Inventory-instances
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        cy.wait(5000); // Wait for the table to update

        // Verify table shows only "Inventory-instances" record types
        BulkEditLogs.verifyLogResultsFound();
        BulkEditLogs.verifyRecordTypesValues();
      },
    );
  });
});
