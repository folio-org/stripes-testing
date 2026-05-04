import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_SOURCE_NAMES,
} from '../../../../support/constants';

let user;
let instanceTypeId;
const folioInstance = {
  title: `AT_C651537_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C651537_MarcInstance_${getRandomPostfix()}`,
};
const linkedDataInstance = {
  title: `AT_C651537_LinkedDataInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `AT_C651537_instanceUUIDs_${getRandomPostfix()}.csv`;
const instanceHRIDsFileName = `AT_C651537_instanceHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingUUIDsFileName =
  BulkEditFiles.getErrorsFromMatchingFileName(instanceUUIDsFileName);
const errorsFromMatchingHRIDsFileName =
  BulkEditFiles.getErrorsFromMatchingFileName(instanceHRIDsFileName);

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
              cy.createInstance({
                instance: { instanceTypeId, title: folioInstance.title },
              }).then((instanceId) => {
                folioInstance.uuid = instanceId;
              });
              cy.createInstance({
                instance: { instanceTypeId, title: linkedDataInstance.title },
              }).then((instanceId) => {
                linkedDataInstance.uuid = instanceId;
              });
            })
            .then(() => {
              cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                marcInstance.hrid = instanceData.hrid;
              });
              cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                folioInstance.hrid = instanceData.hrid;
              });
              cy.getInstanceById(linkedDataInstance.uuid).then((instanceData) => {
                linkedDataInstance.hrid = instanceData.hrid;
                instanceData.source = INSTANCE_SOURCE_NAMES.LDE;
                cy.updateInstance(instanceData);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.uuid}\n${marcInstance.uuid}\n${linkedDataInstance.uuid}`,
              );
              FileManager.createFile(
                `cypress/fixtures/${instanceHRIDsFileName}`,
                `${folioInstance.hrid}\n${marcInstance.hrid}\n${linkedDataInstance.hrid}`,
              );
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
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(linkedDataInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          errorsFromMatchingUUIDsFileName,
          errorsFromMatchingHRIDsFileName,
        );
      });

      it(
        'C651537 Verify Instances with source LINKED_DATA are displayed under "Errors & warnings" accordion in Bulk edit (Logs) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C651537'] },
        () => {
          // Step 1: Select "Inventory - instances" and "Instance UUIDs" identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload the UUID file
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Verify upload results - preview shows FOLIO and MARC instances, errors show LINKED_DATA
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            folioInstance.hrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 4: Verify LINKED_DATA error reason and UUID in "Record identifier"
          BulkEditSearchPane.verifyErrorByIdentifier(
            linkedDataInstance.uuid,
            ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED,
          );

          // Step 5: Download errors CSV and verify filename and content
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
            `ERROR,${linkedDataInstance.uuid},${ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED}`,
          ]);
          FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingUUIDsFileName);

          // Step 6: Switch to "Instance HRIDs" identifier and upload the HRID file
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Verify upload results for HRID file
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            folioInstance.hrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 7: Verify LINKED_DATA error reason and HRID in "Record identifier"
          BulkEditSearchPane.verifyErrorByIdentifier(
            linkedDataInstance.hrid,
            ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED,
          );

          // Step 8: Download errors CSV and verify filename and content
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
            `ERROR,${linkedDataInstance.hrid},${ERROR_MESSAGES.LINKED_DATA_SOURCE_NOT_SUPPORTED}`,
          ]);
          FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingHRIDsFileName);

          // Step 9: Navigate to Logs tab and verify both jobs
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.clickUserAccordion();
          BulkEditLogs.clickChooseUserUnderUserAccordion();
          BulkEditLogs.fillUserFilterInput(user.username);
          BulkEditLogs.selectUserFromDropdown(user.username);
          cy.wait(2000);

          // Verify Status, Editing, # of records and Processed for both jobs
          BulkEditLogs.verifyCellsValues(2, 'Data modification');
          BulkEditLogs.verifyCellsValues(3, 'In app');
          BulkEditLogs.verifyCellsValues(4, '3');
          BulkEditLogs.verifyCellsValues(5, '3');
        },
      );
    });
  });
});
