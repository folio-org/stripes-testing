import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import SelectInstanceModal from '../../../../support/fragments/requests/selectInstanceModal';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
const testData = {};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${instanceUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${instanceUUIDsFileName}`;
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const unsuppressedFolioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `unsuppressedFolioItem${getRandomPostfix()}`,
};
const userServicePoint = ServicePoints.getDefaultServicePoint();
const marcInstances = InventoryInstances.generateFolioInstances({ count: 2 });

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.enableStaffSuppressFacet.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;
          ServicePoints.createViaApi(userServicePoint);
          testData.defaultLocation = Locations.getDefaultLocation({
            servicePointId: userServicePoint.id,
          }).location;
          Locations.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createMarcInstancesViaApi({
              marcInstances,
              location,
            });
          });
          folioItem.instanceId = InventoryInstances.createInstanceViaApi(
            folioItem.instanceName,
            folioItem.itemBarcode,
          );
          unsuppressedFolioItem.instanceId = InventoryInstances.createInstanceViaApi(
            unsuppressedFolioItem.instanceName,
            unsuppressedFolioItem.itemBarcode,
          );
          [folioItem.instanceId, marcInstances[0].instanceId].forEach((instanceId) => {
            cy.getInstanceById(instanceId).then((body) => {
              body.staffSuppress = true;
              cy.updateInstance(body);
            });
          });
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            `${marcInstances[0].instanceId}\n${folioItem.instanceId}\n${marcInstances[1].instanceId}\n${unsuppressedFolioItem.instanceId}`,
          );
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
        InventoryInstances.deleteInstanceViaApi({
          instance: marcInstances[0],
          servicePoint: userServicePoint,
        });
        InventoryInstances.deleteInstanceViaApi({
          instance: marcInstances[1],
          servicePoint: userServicePoint,
        });
        Locations.deleteViaApi(testData.defaultLocation);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          updatedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C651448 Verify generated Logs files for Instances staff suppress (Set true) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C651448'] },
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
            `${marcInstances[0].instanceId},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,false,`,
            `${marcInstances[1].instanceId},false,false`,
          ]);
          BulkEditActions.openStartBulkEditInstanceForm();
          BulkEditActions.verifyModifyLandingPageBeforeModifying();
          BulkEditActions.selectOption('Staff suppress');
          BulkEditSearchPane.verifyInputLabel('Staff suppress');
          BulkEditActions.selectSecondAction('Set true');
          BulkEditActions.verifyCheckboxAbsent();
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(4, folioItem.instanceId);
          BulkEditActions.verifyAreYouSureForm(4, marcInstances[0].instanceId);
          BulkEditActions.verifyAreYouSureForm(4, unsuppressedFolioItem.instanceId);
          BulkEditActions.verifyAreYouSureForm(4, marcInstances[1].instanceId);
          BulkEditActions.downloadPreview();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstances[0].instanceId},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstances[1].instanceId},false,true,`,
          ]);
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          BulkEditSearchPane.verifyLocationChanges(2, 'true');
          BulkEditSearchPane.verifyChangedResults(
            unsuppressedFolioItem.instanceId,
            marcInstances[1].instanceId,
          );
          BulkEditSearchPane.verifyNonMatchedResults(
            folioItem.instanceId,
            marcInstances[0].instanceId,
          );
          BulkEditSearchPane.verifyErrorLabelAfterChanges(instanceUUIDsFileName, 2, 2);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstances[1].instanceId},false,true,`,
          ]);
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            folioItem.instanceId,
            marcInstances[0].instanceId,
          ]);

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrors();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [
            marcInstances[0].instanceId,
            folioItem.instanceId,
            marcInstances[1].instanceId,
            unsuppressedFolioItem.instanceId,
          ]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstances[0].instanceId},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,false,`,
            `${marcInstances[1].instanceId},false,false`,
          ]);

          BulkEditLogs.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,true,`,
            `${marcInstances[0].instanceId},false,true,`,
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstances[1].instanceId},false,true,`,
          ]);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            `${unsuppressedFolioItem.instanceId},false,true,`,
            `${marcInstances[1].instanceId},false,true,`,
          ]);

          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            folioItem.instanceId,
            marcInstances[0].instanceId,
          ]);

          [
            unsuppressedFolioItem.instanceName,
            marcInstances[1].instanceTitle,
            folioItem.instanceName,
            marcInstances[0].instanceTitle,
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
