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
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
const hridValues = {};
const testData = {};
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceHRIDFileName}`;
const previewFileName = `*-Updates-Preview-${instanceHRIDFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${instanceHRIDFileName}`;
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const userServicePoint = ServicePoints.getDefaultServicePoint();
const marcInstances = InventoryInstances.generateFolioInstances();

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
          cy.getInstanceById(marcInstances[0].instanceId).then((body) => {
            body.staffSuppress = false;
            cy.updateInstance(body);
          });
          folioItem.instanceId = InventoryInstances.createInstanceViaApi(
            folioItem.instanceName,
            folioItem.itemBarcode,
          );
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${folioItem.instanceId}"`,
          }).then((instance) => {
            hridValues.folioHrid = instance.hrid;
            FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, instance.hrid);
          });
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${marcInstances[0].instanceId}"`,
          }).then((instance) => {
            hridValues.marcHrid = instance.hrid;
            FileManager.appendFile(
              `cypress/fixtures/${instanceHRIDFileName}`,
              `\n${instance.hrid}\n`,
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
        InventoryInstances.deleteInstanceViaApi({
          instance: marcInstances[0],
          servicePoint: userServicePoint,
        });
        Locations.deleteViaApi(testData.defaultLocation);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C651447 Verify generated Logs files for Instances staff suppress (Set false) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C651447'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID');
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Staff suppress');
          BulkEditSearchPane.verifyResultColumnTitles('Staff suppress');
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            `${folioItem.instanceId},false,false,`,
            `${marcInstances[0].instanceId},false,false,`,
          ]);
          BulkEditActions.openStartBulkEditInstanceForm();
          BulkEditActions.verifyModifyLandingPageBeforeModifying();
          BulkEditActions.selectOption('Staff suppress');
          BulkEditSearchPane.verifyInputLabel('Staff suppress');
          BulkEditActions.selectSecondAction('Set false');
          BulkEditActions.verifyCheckboxAbsent();
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(2, folioItem.instanceId);
          BulkEditActions.verifyAreYouSureForm(2, marcInstances[0].instanceId);
          BulkEditActions.downloadPreview();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,false,`,
            `${marcInstances[0].instanceId},false,false,`,
          ]);
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(0);
          BulkEditSearchPane.verifyErrorLabelAfterChanges(instanceHRIDFileName, 0, 2);
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            hridValues.folioHrid,
            hridValues.marcHrid,
          ]);

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceHRIDFileName, [
            hridValues.folioHrid,
            hridValues.marcHrid,
          ]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            `${folioItem.instanceId},false,false,`,
            `${marcInstances[0].instanceId},false,false,`,
          ]);

          BulkEditLogs.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewFileName, [
            `${folioItem.instanceId},false,false,`,
            `${marcInstances[0].instanceId},false,false,`,
          ]);

          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            hridValues.folioHrid,
            hridValues.marcHrid,
          ]);

          [folioItem.instanceName, marcInstances[0].instanceTitle].forEach((title) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            SelectInstanceModal.filterByStaffSuppress('No');
            InventorySearchAndFilter.searchInstanceByTitle(title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.verifyNoStaffSuppress();
          });
        },
      );
    });
  });
});
