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
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_NOTE_TYPES,
} from '../../../support/constants';

let user;
const noteText = {
  administrative: 'Administrative note text',
  electronicBookplate: 'Electronic bookplate note text',
};
const instance = {
  title: `C1292049 folio instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  itemNoteName: ITEM_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
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
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C1292049 Verify Bulk Edit actions for Items notes - change note type to circulation note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1292049'] },
      () => {
        // Step 1: Select "Inventory - items" radio button => Select "Item barcodes" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        // Step 2: Upload CSV file with Item barcodes by dragging to "Drag & drop" area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading - verify "Preview of records matched" shows matched Items
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 4: Click "Actions" menu => Check checkboxes (if not checked): "Administrative note", "Electronic bookplate note"
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
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

        // Step 5: Click "Actions" menu => Select "Download matched records (CSV)"
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: noteText.administrative,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
              value: noteText.electronicBookplate,
            },
          ],
        );

        // Step 6: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();

        // Step 7: Select "Administrative note" from "Select option" => Select "Change note type" from "Select action" => Select "Check in note" from "Data" dropdown
        BulkEditActions.changeNoteType(
          ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE,
          ITEM_NOTE_TYPES.CHECK_IN_NOTE,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Click on the "Plus" icon to add new bulk edit row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();

        // Step 9: Select "Electronic bookplate" from "Select option" => Select "Change note type" from "Select action" => Select "Check out note" from "Data" dropdown
        BulkEditActions.changeNoteType(
          ITEM_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
          ITEM_NOTE_TYPES.CHECK_OUT_NOTE,
          1,
        );

        const updatedNotesHeaderValueSets = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: noteText.administrative,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: noteText.electronicBookplate,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
            value: '',
          },
        ];

        // Step 10: Click "Confirm changes" button => Verify "Are you sure?" form appears with preview showing notes in appropriate columns
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          instance.itemBarcode,
          updatedNotesHeaderValueSets,
        );

        // Step 11: Click "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          updatedNotesHeaderValueSets,
        );

        // Step 12: Click "Commit changes" button => Verify success banner and "Preview of records changed" shows updated records
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          updatedNotesHeaderValueSets,
        );

        // Step 13: Click "Actions" menu => Select "Download changed records (CSV)"
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          updatedNotesHeaderValueSets,
        );

        // Step 14: Navigate to "Inventory" app => Search for edited Items => Verify changes applied: Administrative note changed to Check in note, Electronic bookplate changed to Check out note
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote('No value set\n-');
        ItemRecordView.checkItemNoteAbsent(ITEM_NOTE_TYPES.ELECTRONIC_BOOKPLATE);
        ItemRecordView.checkCheckInNote(noteText.administrative, 'No');
        ItemRecordView.checkCheckOutNote(noteText.electronicBookplate, 'No');
      },
    );
  });
});
