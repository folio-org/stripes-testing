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

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${instanceUUIDsFileName}`;
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const adminNotes = {
  lower: 'adminNote',
  upper: 'AdminNote',
};
const newAdminNote = 'edited AdminNote';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
        marcInstance.instanceId = InventoryInstances.createInstanceViaApi(
          marcInstance.instanceName,
          marcInstance.itemBarcode,
        );
        [marcInstance.instanceId, folioItem.instanceId].forEach((instanceId) => {
          cy.getInstanceById(instanceId).then((body) => {
            body.administrativeNotes = [adminNotes.lower, adminNotes.upper];
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(marcInstance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C605963 Bulk edit Instance fields - find and replace administrative note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C605963'] },
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
        // TODO: uncomment line
        // BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.noteReplaceWith('Administrative note', adminNotes.upper, newAdminNote);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Administrative note',
          `${adminNotes.lower} | ${newAdminNote}`,
          0,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Administrative note',
          `${adminNotes.lower} | ${newAdminNote}`,
          1,
        );
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${adminNotes.lower} | ${newAdminNote},${folioItem.instanceName},`,
          `,${adminNotes.lower} | ${newAdminNote},${marcInstance.instanceName},`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyChangedResults(folioItem.instanceId, marcInstance.instanceId);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${adminNotes.lower} | ${newAdminNote},${folioItem.instanceName},`,
          `,${adminNotes.lower} | ${newAdminNote},${marcInstance.instanceName},`,
        ]);

        [folioItem.instanceName, marcInstance.instanceName].forEach((title) => {
          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          ItemRecordView.checkItemAdministrativeNote(adminNotes.lower);
          ItemRecordView.checkItemAdministrativeNote(newAdminNote);
        });
      },
    );
  });
});
