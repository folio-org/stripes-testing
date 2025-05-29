import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `AT_466312_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `AT_466312_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const adminNote = 'Te;st: [administrative] no*te.csv';
const editedAdminNote = 'Te;st:  no*te.csv';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        folioItem.instanceId = InventoryInstances.createInstanceViaApi(
          folioItem.instanceName,
          folioItem.itemBarcode,
        );
        cy.createSimpleMarcBibViaAPI(marcInstance.instanceName).then((instanceId) => {
          marcInstance.instanceId = instanceId;

          [marcInstance.instanceId, folioItem.instanceId].forEach((id) => {
            cy.getInstanceById(id).then((body) => {
              body.administrativeNotes = [adminNote];
              cy.updateInstance(body);
            });
          });
          InventoryHoldings.getHoldingsMarcSource().then((marcSource) => {
            cy.getInstanceById(marcInstance.instanceId).then((body) => {
              body.source = marcSource.name;
              body.sourceId = marcSource.id;
              cy.updateInstance(body);
            });
          });
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            `${marcInstance.instanceId}\n${folioItem.instanceId}`,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        instanceUUIDsFileName,
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C466312 Bulk edit Instance fields - find and remove administrative note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C466312'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Instance UUID',
          'Source',
          'Administrative note',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'FOLIO');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'MARC');
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,${adminNote},${folioItem.instanceName},`,
          `,${adminNote},${marcInstance.instanceName},`,
        ]);
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.noteRemove('Administrative note', '[administrative]');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Administrative note',
          editedAdminNote,
          0,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Administrative note',
          editedAdminNote,
          1,
        );
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${editedAdminNote},${folioItem.instanceName},`,
          `,${editedAdminNote},${marcInstance.instanceName},`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyChangedResults(folioItem.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${editedAdminNote},${folioItem.instanceName},`,
          `,${editedAdminNote},${marcInstance.instanceName},`,
        ]);

        [folioItem.instanceName, marcInstance.instanceName].forEach((title) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          ItemRecordView.verifyTextAbsent(adminNote);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        BulkEditLogs.downloadFileUsedToTrigger();
        BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [
          marcInstance.instanceId,
          folioItem.instanceId,
        ]);
        BulkEditLogs.downloadFileWithMatchingRecords();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,${adminNote},${folioItem.instanceName},`,
          `,${adminNote},${marcInstance.instanceName},`,
        ]);

        BulkEditLogs.downloadFileWithProposedChanges();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${editedAdminNote},${folioItem.instanceName},`,
          `,${editedAdminNote},${marcInstance.instanceName},`,
        ]);

        BulkEditLogs.downloadFileWithUpdatedRecords();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${editedAdminNote},${folioItem.instanceName},`,
          `,${editedAdminNote},${marcInstance.instanceName},`,
        ]);
      },
    );
  });
});
