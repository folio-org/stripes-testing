import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
// import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
// import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
// import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
// import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const notes = {
  administrative: 'Administrative note text',
  checkInNote: 'CheckInNote',
  checkOutNote: 'CheckOutNote',
  electronicBookplate: 'Electronic bookplate note text',
};
const instance = {
  title: `C411509 folio instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  itemNoteName: 'Electronic bookplate note',
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.inventoryCRUDItemNoteTypes.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(instance.title, instance.itemBarcode);
        InventoryInstances.getItemNoteTypes({
          query: `name="${instance.itemNoteName}"`,
        }).then((res) => {
          instance.noteTypeId = res[0].id;
        });
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${instance.itemBarcode}"`,
        }).then((res) => {
          const itemData = res;
          itemData.administrativeNotes = [notes.administrative];
          itemData.notes = [
            {
              itemNoteTypeId: instance.noteTypeId,
              note: notes.electronicBookplate,
              staffOnly: false,
            },
          ];
          itemData.circulationNotes = [
            { noteType: 'Check in', note: notes.checkInNote, staffOnly: true },
            { noteType: 'Check out', note: notes.checkOutNote, staffOnly: true },
          ];
          cy.updateItemViaApi(itemData);
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, instance.itemBarcode);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C411509 Verify Bulk Edit actions for Items notes - change note type ( "Staff only" checkbox ) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C411509'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);
        // 4
        BulkEditActions.openActions();

        const checkedColumnHeaders = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTES,
        ];
        const checkedColumnValues = Object.values(notes);

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...checkedColumnHeaders);

        checkedColumnHeaders.forEach((checkedColumnHeader, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instance.itemBarcode,
            checkedColumnHeader,
            checkedColumnValues[index],
          );
        });

        // 5
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          // firstInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          // firstInstance.title,
        );

        // BulkEditActions.openInAppStartBulkEditFrom();

        // BulkEditActions.verifyItemOptions();
        // BulkEditActions.verifyItemCheckInNoteActions();
        // BulkEditActions.duplicateCheckInNote();

        // BulkEditActions.confirmChanges();

        // const checkIn = [`${notes.checkInNote} (staff only)`, notes.checkInNote];
        // const checkOut = [
        //   `${notes.checkInNote} (staff only)`,
        //   notes.checkInNote,
        //   `${notes.checkOutNote} (staff only)`,
        //   notes.checkOutNote,
        // ];
        // BulkEditActions.verifyChangesInAreYouSureForm('Check out note', checkOut);
        // BulkEditActions.verifyChangesInAreYouSureForm('Check in note', checkIn);
        // BulkEditActions.commitChanges();
        // BulkEditSearchPane.waitFileUploading();
        // BulkEditSearchPane.verifyChangedResults(item.barcode);
        // BulkEditActions.openActions();
        // BulkEditActions.downloadChangedCSV();
        // ExportFile.verifyFileIncludes(changedRecordsFileName, [...checkIn, ...checkOut]);

        // checkOut.forEach((value) => {
        //   BulkEditSearchPane.verifyChangesUnderColumns('Check out note', value);
        // });
        // checkIn.forEach((value) => {
        //   BulkEditSearchPane.verifyChangesUnderColumns('Check in note', value);
        // });

        // TopMenuNavigation.navigateToApp('Inventory');
        // InventorySearchAndFilter.switchToItem();
        // InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        // ItemRecordView.waitLoading();
        // ItemRecordView.checkCheckInNote(`${notes.checkInNote}${notes.checkInNote}`, 'Yes\nNo');
        // ItemRecordView.checkCheckOutNote(
        //   `${notes.checkOutNote}${notes.checkOutNote}${notes.checkInNote}${notes.checkInNote}`,
        //   'Yes\nNo\nYes\nNo',
        // );
      },
    );
  });
});
