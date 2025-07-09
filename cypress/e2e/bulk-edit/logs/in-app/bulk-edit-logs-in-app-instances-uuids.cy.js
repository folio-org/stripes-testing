import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import SelectInstanceModal from '../../../../support/fragments/requests/selectInstanceModal';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const updatedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const unsuppressedFolioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `unsuppressedFolioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C423988_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceUnsuppressed = {
  title: `AT_C423988_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceIds = [];

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.enableStaffSuppressFacet.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          folioItem.instanceId = InventoryInstances.createInstanceViaApi(
            folioItem.instanceName,
            folioItem.itemBarcode,
          );
          unsuppressedFolioItem.instanceId = InventoryInstances.createInstanceViaApi(
            unsuppressedFolioItem.instanceName,
            unsuppressedFolioItem.itemBarcode,
          );
          cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
            marcInstanceIds.push(instanceId);
          });
          cy.createSimpleMarcBibViaAPI(marcInstanceUnsuppressed.title).then((instanceId) => {
            marcInstanceIds.push(instanceId);

            [folioItem.instanceId, marcInstanceIds[0]].forEach((id) => {
              cy.getInstanceById(id).then((body) => {
                body.staffSuppress = true;
                cy.updateInstance(body);
              });
            });
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${marcInstanceIds[0]}\n${folioItem.instanceId}\n${marcInstanceIds[1]}\n${unsuppressedFolioItem.instanceId}`,
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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          unsuppressedFolioItem.itemBarcode,
        );

        marcInstanceIds.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          updatedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C423988 Verify generated Logs files for Instances (Instance UUIDs) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C423988'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID');
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Staff suppress');
          BulkEditSearchPane.verifyResultColumnTitles('Staff suppress');
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstanceIds[0]},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,false,`,
            `${marcInstanceIds[1]},false,false,`,
          ]);
          BulkEditActions.openStartBulkEditInstanceForm();
          BulkEditActions.verifyModifyLandingPageBeforeModifying();
          BulkEditActions.selectOption('Staff suppress');
          BulkEditSearchPane.verifyInputLabel('Staff suppress');
          BulkEditActions.selectAction('Set true');
          BulkEditActions.verifyCheckboxAbsent();
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(4, folioItem.instanceId);
          BulkEditActions.verifyAreYouSureForm(4, marcInstanceIds[0]);
          BulkEditActions.verifyAreYouSureForm(4, unsuppressedFolioItem.instanceId);
          BulkEditActions.verifyAreYouSureForm(4, marcInstanceIds[1]);
          BulkEditActions.downloadPreview();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstanceIds[0]},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstanceIds[1]},false,true,`,
          ]);
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          BulkEditSearchPane.verifyLocationChanges(2, 'true');
          BulkEditSearchPane.verifyChangedResults(
            unsuppressedFolioItem.instanceId,
            marcInstanceIds[1],
          );

          BulkEditSearchPane.verifyErrorLabel(0, 2);

          [folioItem.instanceId, marcInstanceIds[0]].forEach((instanceId) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instanceId,
              'No change in value required',
              'Warning',
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstanceIds[1]},false,true,`,
          ]);
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `WARNING,${folioItem.instanceId},No change in value required`,
            `WARNING,${marcInstanceIds[0]},No change in value required`,
          ]);

          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsFileName,
            previewFileName,
            updatedRecordsFileName,
            errorsFromCommittingFileName,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrors();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [
            marcInstanceIds[0],
            folioItem.instanceId,
            marcInstanceIds[1],
            unsuppressedFolioItem.instanceId,
          ]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstanceIds[0]},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,false,`,
            `${marcInstanceIds[1]},false,false,`,
          ]);

          BulkEditLogs.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstanceIds[0]},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstanceIds[1]},false,true,`,
          ]);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstanceIds[1]},false,true,`,
          ]);

          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `WARNING,${folioItem.instanceId},No change in value required`,
            `WARNING,${marcInstanceIds[0]},No change in value required`,
          ]);

          [
            unsuppressedFolioItem.instanceName,
            marcInstance.title,
            folioItem.instanceName,
            marcInstanceUnsuppressed.title,
          ].forEach((title) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            SelectInstanceModal.filterByStaffSuppress('Yes');
            InventorySearchAndFilter.searchInstanceByTitle(title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.verifyStaffSuppress();
          });
        },
      );
    });
  });
});
