import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const noteTypes = {
  action: 'Action note',
  administrative: 'Administrative note',
  binding: 'Binding',
  checkIn: 'Check in note',
  provenance: 'Provenance',
  electronicBookplate: 'Electronic bookplate',
};
const noteText = {
  administrative: 'Administrative note text',
  electronicBookplate: 'Electronic bookplate note text',
  checkInNote: 'CheckInNote',
  checkOutNote: 'CheckOutNote',
};
const instance = {
  title: `C411509 folio instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  itemNoteName: 'Electronic bookplate',
};
const electronicBookplateActionOptions = [
  'Add note',
  'Change note type',
  'Find',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
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
          instance.itemId = itemData.id;
          itemData.administrativeNotes = [noteText.administrative];
          itemData.notes = [
            {
              itemNoteTypeId: instance.noteTypeId,
              note: noteText.electronicBookplate,
              staffOnly: false,
            },
          ];
          itemData.circulationNotes = [
            { noteType: 'Check in', note: noteText.checkInNote, staffOnly: true },
            { noteType: 'Check out', note: noteText.checkOutNote, staffOnly: true },
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
      FileManager.deleteFileFromDownloadsByMask(
        changedRecordsFileName,
        matchedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C411509 Verify Bulk Edit actions for Items notes - change note type ( "Staff only" checkbox ) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C411509'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          noteText.administrative,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
          noteText.electronicBookplate,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          `${noteText.checkInNote} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          `${noteText.checkOutNote} (staff only)`,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          noteText.administrative,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
          noteText.electronicBookplate,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          `${noteText.checkInNote} (staff only)`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          `${noteText.checkOutNote} (staff only)`,
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyGroupOptionsInSelectOptionsItemDropdown();
        BulkEditActions.clickOptionsSelection();
        BulkEditActions.verifyItemOptions();
        BulkEditActions.changeNoteType(noteTypes.administrative, noteTypes.action);
        BulkEditActions.verifyNoteTypeAbsentInNoteItemTypeDropdown(noteTypes.administrative);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.changeNoteType(noteTypes.checkIn, noteTypes.binding, 1);
        BulkEditActions.verifyItemCheckInNoteActions(1);
        BulkEditActions.verifyNoteTypeAbsentInNoteItemTypeDropdown(noteTypes.checkIn, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);
        BulkEditActions.changeNoteType(noteTypes.electronicBookplate, noteTypes.provenance, 2);
        BulkEditActions.verifyNoteTypeAbsentInNoteItemTypeDropdown(
          noteTypes.electronicBookplate,
          2,
        );
        BulkEditActions.verifyTheActionOptions(electronicBookplateActionOptions, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        const updatedNotesHeaderValueSets = [
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE, noteText.administrative],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
            `${noteText.checkInNote} (staff only)`,
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PROVENANCE_NOTE,
            noteText.electronicBookplate,
          ],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE, ''],
        ];

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

        updatedNotesHeaderValueSets.forEach((updatedNoteHeaderValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instance.itemBarcode,
            ...updatedNoteHeaderValue,
          );
        });

        BulkEditActions.downloadPreview();

        updatedNotesHeaderValueSets.forEach((updatedNoteHeaderValue) => {
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            instance.itemId,
            ...updatedNoteHeaderValue,
          );
        });

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 item');

        updatedNotesHeaderValueSets.forEach((updatedNoteHeaderValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instance.itemBarcode,
            ...updatedNoteHeaderValue,
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        updatedNotesHeaderValueSets.forEach((updatedNoteHeaderValue) => {
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            instance.itemId,
            ...updatedNoteHeaderValue,
          );
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkActionNote(noteText.administrative);
        ItemRecordView.checkBindingNoteWithStaffValue(noteText.checkInNote, 'Yes');
        ItemRecordView.checkProvenanceNote(noteText.electronicBookplate);
      },
    );
  });
});
