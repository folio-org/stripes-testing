import permissions from '../../../support/dictionary/permissions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
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

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};
const adminNote = 'adminNote';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
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
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C466309 Bulk edit Instance fields - remove all administrative notes (firebird)',
      { tags: ['criticalPath', 'firebird', 'C466309'] },
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
          folioItem.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.noteRemoveAll('Administrative note');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Administrative note', '', 0);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Administrative note', '', 1);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,,${folioItem.instanceName},`,
          `,,${marcInstance.instanceName},`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyChangedResults(folioItem.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,,${folioItem.instanceName},`,
          `,,${marcInstance.instanceName},`,
        ]);

        [folioItem.instanceName, marcInstance.instanceName].forEach((title) => {
          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          ItemRecordView.verifyTextAbsent(adminNote);
        });
      },
    );
  });
});
