import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
const notes = {
  checkInNote: 'CheckInNote',
  checkOutNote: 'CheckOutNote',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

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
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: true },
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: false },
              { noteType: 'Check out', note: notes.checkOutNote, staffOnly: true },
              { noteType: 'Check out', note: notes.checkOutNote, staffOnly: false },
            ];
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C405535 Verify Bulk Edit actions for Items notes - duplicate check out note to check in note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C405535'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Check out note', 'Check in note');
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemCheckInNoteActions();
        BulkEditActions.duplicateCheckInNote('out');

        BulkEditActions.confirmChanges();
        const checkIn = [
          `${notes.checkInNote} (staff only)`,
          notes.checkInNote,
          `${notes.checkOutNote} (staff only)`,
          notes.checkOutNote,
        ];
        const checkOut = [`${notes.checkOutNote} (staff only)`, notes.checkOutNote];
        BulkEditActions.verifyChangesInAreYouSureForm('Check out note', checkOut);
        BulkEditActions.verifyChangesInAreYouSureForm('Check in note', checkIn);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [...checkIn, ...checkOut]);

        checkOut.forEach((value) => {
          BulkEditSearchPane.verifyChangesUnderColumns('Check out note', value);
        });
        checkIn.forEach((value) => {
          BulkEditSearchPane.verifyChangesUnderColumns('Check in note', value);
        });

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(
          `${notes.checkInNote}${notes.checkInNote}${notes.checkOutNote}${notes.checkOutNote}`,
          'YesNoYesNo',
        );
        ItemRecordView.checkCheckOutNote(`${notes.checkOutNote}${notes.checkOutNote}`, 'YesNo');
      },
    );
  });
});
