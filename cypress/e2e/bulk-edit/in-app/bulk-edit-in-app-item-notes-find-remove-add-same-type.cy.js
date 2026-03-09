import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const checkOutNote = `Te;st: [sample] no*te${getRandomPostfix()}`;
const checkInNote = `Check in note text${getRandomPostfix()}`;

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const previewFileName = BulkEditFiles.getPreviewFileName(itemHRIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemHRIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.inventoryCRUDItemNoteTypes.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            res.circulationNotes = [{ noteType: 'Check out', note: checkOutNote, staffOnly: true }];
            cy.updateItemViaApi(res);
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, res.hrid);
          },
        );
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName, previewFileName);
    });

    it(
      'C411641 Verify Bulk Edit actions for Items notes - Find-Remove and Add the same type (firebird)',
      { tags: ['criticalPath', 'firebird', 'C411641'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Check in note', 'Check out note');
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyItemOptions();
        BulkEditActions.noteRemove('Check out note', checkOutNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Check in note', checkInNote, 1);
        BulkEditActions.verifyItemCheckInNoteActions(1);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Check in note', [checkInNote]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`${checkInNote},,`]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [`${checkInNote},,`]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(checkInNote, 'No');
        ItemRecordView.verifyTextAbsent('Check out note');
      },
    );
  });
});
