import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../../support/fragments/inventory/item/itemRecordView';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let instanceTypeId;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const marcInstance = {
  title: `AT_C466300_MarcInstance_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C466300_FolioInstance_${getRandomPostfix()}`,
};
const adminNote = 'adminNote~!@#$%^&*()~{.[]<}>øÆ§';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
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
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            `${marcInstance.instanceId}\n${folioInstance.instanceId}`,
          );
        });

      cy.wait(5000);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete test data', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      cy.setTenant(memberTenant.id);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId, true);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId, true);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C466300 Bulk edit Instance fields - add administrative note (firebird)',
      { tags: ['dryRun', 'firebird', 'C466300'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID');
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Source');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'FOLIO');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'MARC');
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          folioInstance.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.addItemNote('Administrative note', adminNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditActions.verifyAreYouSureForm(2, folioInstance.instanceId);
        BulkEditActions.verifyAreYouSureForm(2, marcInstance.instanceId);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `${adminNote},${folioInstance.title},`,
          `${adminNote},${marcInstance.title},`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyLocationChanges(2, adminNote);
        BulkEditSearchPane.verifyChangedResults(folioInstance.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `${adminNote},${folioInstance.title},`,
          `${adminNote},${marcInstance.title},`,
        ]);

        [folioInstance.title, marcInstance.title].forEach((title) => {
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.searchInstanceByTitle(title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          ItemRecordView.checkItemAdministrativeNote(adminNote);
        });
      },
    );
  });
});
