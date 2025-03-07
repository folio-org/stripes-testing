import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SelectInstanceModal from '../../../support/fragments/requests/selectInstanceModal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const testData = {};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const userServicePoint = ServicePoints.getDefaultServicePoint();
const marcInstances = InventoryInstances.generateFolioInstances();

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.enableStaffSuppressFacet.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
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
        FileManager.createFile(
          `cypress/fixtures/${instanceUUIDsFileName}`,
          `${marcInstances[0].instanceId}\n${folioItem.instanceId}`,
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
      InventoryInstances.deleteInstanceViaApi({
        instance: marcInstances[0],
        servicePoint: userServicePoint,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C423979 Verify "Staff suppress" (Set true) option in Bulk Editing - Instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423979'] },
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
          marcInstances[0].instanceId,
          folioItem.instanceId,
        ]);
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        const possibleActions = ['Staff suppress', 'Suppress from discovery'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectOption('Staff suppress');
        BulkEditSearchPane.verifyInputLabel('Staff suppress');
        BulkEditActions.selectSecondAction('Set true');
        BulkEditActions.verifyCheckboxAbsent();
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditActions.verifyAreYouSureForm(2, folioItem.instanceId);
        BulkEditActions.verifyAreYouSureForm(2, marcInstances[0].instanceId);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          folioItem.instanceId,
          marcInstances[0].instanceId,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, 'true');
        BulkEditSearchPane.verifyChangedResults(folioItem.instanceId, marcInstances[0].instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${folioItem.instanceId},false,true,`,
          `${marcInstances[0].instanceId},false,true,`,
        ]);

        [folioItem.instanceName, marcInstances[0].instanceTitle].forEach((title) => {
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
