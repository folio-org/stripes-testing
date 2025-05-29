import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_NOTES } from '../../../support/constants';

let user;
const notes = {
  admin: 'Te;st: [sample] no*te',
  action: 'Te;st: [sample] no*te',
  checkIn: 'Te;st: [sample] no*te',
  checkOut: 'Te;st: [sample] no*te',
  copy: 'Te;st: [sample] no*te',
};
const editedNotes = {
  admin: '] no*te',
  action: ' [sample] no*te',
  checkIn: 'Te;st: [sample] ',
  checkOut: 'Te;st: [] no*te',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const previewFileName = BulkEditFiles.getPreviewFileName(itemHRIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemHRIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
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
            item.hrid = res.hrid;

            itemData.administrativeNotes = [notes.admin];

            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: notes.action,
                staffOnly: false,
              },
              {
                itemNoteTypeId: ITEM_NOTES.COPY_NOTE,
                note: notes.copy,
                staffOnly: false,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkIn, staffOnly: false },
              { noteType: 'Check out', note: notes.checkOut, staffOnly: false },
            ];
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
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
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewFileName, changedRecordsFileName);
    });

    it(
      'C402355 Verify Bulk Edit actions for Items notes - Find-Remove (firebird)',
      { tags: ['criticalPath', 'firebird', 'C402355'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Check out note',
          'Check in note',
          'Administrative note',
          'Copy note',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.noteRemove('Administrative note', 'Te;st: [sample');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Check in note', 'no*te', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Check out note', 'sample', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Action note', 'Te;st:', 3);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Copy note', 'Test: sample note', 4);
        BulkEditActions.confirmChanges();

        const editedHeaderValue = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: editedNotes.admin,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: editedNotes.checkIn,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: editedNotes.checkOut,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: editedNotes.action,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
            value: notes.copy,
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          item.hrid,
          editedHeaderValue,
        );
        BulkEditActions.verifyAreYouSureForm(1);

        const editedHeaderValueInFiles = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: editedNotes.admin,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: '[sample] no*te',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
            value: notes.copy,
          },
        ];

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          item.hrid,
          editedHeaderValueInFiles,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          item.hrid,
          editedHeaderValue,
        );
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          item.hrid,
          editedHeaderValueInFiles,
        );

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(editedNotes.admin);
        ItemRecordView.checkCheckInNote(editedNotes.checkIn, 'No');
        ItemRecordView.checkCheckOutNote(editedNotes.checkOut, 'No');
        ItemRecordView.checkActionNote(editedNotes.action);
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(1, 'No', 'Copy note', notes.copy);
      },
    );
  });
});
