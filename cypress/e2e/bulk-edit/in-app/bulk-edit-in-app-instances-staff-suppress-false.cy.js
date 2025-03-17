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
  title: `AT_C423980_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C423980_MarcInstance_${getRandomPostfix()}`,
};

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

            cy.createSimpleMarcBibViaAPI(marcInstance.title).then((marcInstancenstanceId) => {
              marcInstance.instanceId = marcInstancenstanceId;

              [marcInstance.instanceId, folioInstance.instanceId].forEach((instanceId) => {
                cy.getInstanceById(instanceId).then((body) => {
                  body.staffSuppress = true;
                  cy.updateInstance(body);
                });
              });
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.instanceId}\n${marcInstance.instanceId}`,
              );
            });
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
      'C423980 Verify "Staff suppress" (Set false) option in Bulk Editing - Instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423980'] },
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
          `${folioInstance.instanceId},false,true,`,
          `${marcInstance.instanceId},false,true,`,
        ]);
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        const possibleActions = ['Staff suppress', 'Suppress from discovery'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectOption('Staff suppress');
        BulkEditSearchPane.verifyInputLabel('Staff suppress');
        BulkEditActions.selectSecondAction('Set false');
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
          `${folioInstance.instanceId},false,false,`,
          `${marcInstance.instanceId},false,false,`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, 'false');
        BulkEditSearchPane.verifyChangedResults(folioInstance.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${folioInstance.instanceId},false,false,`,
          `${marcInstance.instanceId},false,false,`,
        ]);

        [folioInstance.title, marcInstance.title].forEach((title) => {
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
