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
import SelectInstanceModal from '../../../support/fragments/requests/selectInstanceModal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let instanceTypeId;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const folioInstance = {
  title: `AT_C423979_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C423979_MarcInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.enableStaffSuppressFacet.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
              },
            }).then((createdInstanceData) => {
              folioInstance.instanceId = createdInstanceData.instanceId;
            });

            cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
              marcInstance.instanceId = instanceId;

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${marcInstance.instanceId}\n${folioInstance.instanceId}`,
              );
            });
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
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
          marcInstance.instanceId,
          folioInstance.instanceId,
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
        BulkEditActions.verifyAreYouSureForm(2, folioInstance.instanceId);
        BulkEditActions.verifyAreYouSureForm(2, marcInstance.instanceId);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          folioInstance.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, 'true');
        BulkEditSearchPane.verifyChangedResults(folioInstance.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${folioInstance.instanceId},false,true,`,
          `${marcInstance.instanceId},false,true,`,
        ]);

        [folioInstance.title, marcInstance.title].forEach((title) => {
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
