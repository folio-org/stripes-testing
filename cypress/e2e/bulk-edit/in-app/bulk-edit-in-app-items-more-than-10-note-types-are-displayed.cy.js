import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_NOTE_TYPES,
} from '../../../support/constants';

let user;
let copyNoteTypeId;
const createdNoteTypeIds = [];
const instance = {
  instanceName: `AT_C440087_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${randomFourDigitNumber()}`,
};
const copyNoteText = `AT_C440087_CopyNote_${getRandomPostfix()}`;
const itemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);
const numberOfNotes = 12;
const createdNoteTypes = [];

for (let i = 1; i <= numberOfNotes; i++) {
  createdNoteTypes.push(`AT_C440087_NoteType_${i}_${randomFourDigitNumber()}`);
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      createdNoteTypes.forEach((noteType) => {
        ItemNoteTypes.createItemNoteTypeViaApi(noteType).then((noteId) => {
          createdNoteTypeIds.push(noteId);
        });
      });
      cy.wait(3000);

      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.getItemNoteTypes({
          query: `name=="${ITEM_NOTE_TYPES.COPY_NOTE}"`,
        }).then((noteTypes) => {
          copyNoteTypeId = noteTypes[0].id;

          instance.instanceId = InventoryInstances.createInstanceViaApi(
            instance.instanceName,
            instance.itemBarcode,
          );

          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${instance.itemBarcode}"`,
          }).then((items) => {
            instance.itemHRID = items.hrid;
            instance.itemUUID = items.id;

            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              `${instance.itemBarcode}`,
            );

            const itemData = items;
            itemData.notes = [
              {
                itemNoteTypeId: copyNoteTypeId,
                note: copyNoteText,
                staffOnly: false,
              },
            ];
            cy.updateItemViaApi(itemData);
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

      createdNoteTypeIds.forEach((noteTypeId) => {
        ItemNoteTypes.deleteItemNoteTypeViaApi(noteTypeId);
      });

      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C440087 Verify more than 10 note types are displayed - items (firebird)',
      { tags: ['extendedPath', 'firebird', 'C440087'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button => Select "Item barcode" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload a .csv file from Preconditions with valid Item barcodes by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          instance.itemBarcode,
        );

        // Step 4: Click "Actions" menu => Select "Download matched records (CSV)" element
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          instance.itemBarcode,
        );

        // Step 5: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // Step 6: Check alphabetical sorting of Options list
        BulkEditActions.verifySelectOptionsSortedAlphabetically();

        createdNoteTypes.forEach((noteType) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(noteType);
        });

        // Step 7: Click "Select option" dropdown
        BulkEditActions.clickOptionsSelection();
        BulkEditActions.selectOption(ITEM_NOTE_TYPES.COPY_NOTE);
        BulkEditActions.verifyOptionSelected(ITEM_NOTE_TYPES.COPY_NOTE);

        // Step 8: Select "Change note type" option from the "Select action" dropdown
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);

        // Step 9: Click the "Select option"dropdown with note types next to "Select action" dropdown
        const defaultNoteTypes = Object.values(ITEM_NOTE_TYPES).filter(
          (noteType) => noteType !== ITEM_NOTE_TYPES.COPY_NOTE,
        );
        const allNoteTypes = [...defaultNoteTypes, ...createdNoteTypes];

        BulkEditActions.verifyTheOptionsForChangingNoteType(allNoteTypes);

        // Step 10: Select "Action note" from "Select note type" dropdown => Click "Confirm changes" button
        BulkEditActions.selectNoteTypeWhenChangingIt(ITEM_NOTE_TYPES.ACTION_NOTE);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            value: instance.itemBarcode,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: copyNoteText,
          },
          {
            header: ITEM_NOTE_TYPES.COPY_NOTE,
            value: '',
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          instance.itemBarcode,
          editedHeaderValues,
        );

        // Step 12: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemUUID,
          editedHeaderValues,
        );

        // Step 13: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner();
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          editedHeaderValues,
        );

        // Step 14: Click "Actions" menu => Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemUUID,
          editedHeaderValues,
        );

        // Step 15: Navigate to "Inventory" app => Search for the recently edited Items => Verify that changes made have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          ITEM_NOTE_TYPES.ACTION_NOTE,
          copyNoteText,
        );
      },
    );
  });
});
