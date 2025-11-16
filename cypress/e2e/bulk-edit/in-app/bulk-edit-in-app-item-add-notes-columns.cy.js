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
import ExportFile from '../../../support/fragments/data-export/exportFile';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_ACTIONS,
  ITEM_NOTE_TYPES,
} from '../../../support/constants';

let user;
let noteTypeId;
let actionNoteTypeId;
const instance = {
  title: `AT_C411629_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);
const actionNoteText = 'AT_C411629_ActionNote';
const additionalActionNoteText = 'AT_C411629_AdditionalActionNote';
const customNoteType = `AT_C411629_CustomNoteType_${randomFourDigitNumber()}`;
const customNoteText = 'AT_C411629_CustomNote\nwith line break';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        ItemNoteTypes.createItemNoteTypeViaApi(customNoteType).then((noteId) => {
          noteTypeId = noteId;
        });

        InventoryInstances.getItemNoteTypes({
          query: `name=="${ITEM_NOTE_TYPES.ACTION_NOTE}"`,
        }).then((noteTypes) => {
          actionNoteTypeId = noteTypes[0].id;

          instance.instanceId = InventoryInstances.createInstanceViaApi(
            instance.title,
            instance.itemBarcode,
          );

          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${instance.itemBarcode}"`,
          }).then((items) => {
            instance.itemId = items.id;
            instance.itemHRID = items.hrid;

            const itemData = items;
            itemData.notes = [
              {
                itemNoteTypeId: actionNoteTypeId,
                note: actionNoteText,
                staffOnly: false,
              },
            ];
            cy.updateItemViaApi(itemData);

            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              instance.itemBarcode,
            );
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
      ItemNoteTypes.deleteItemNoteTypeViaApi(noteTypeId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C411629 Verify separating notes in different columns - add notes (firebird)',
      { tags: ['extendedPath', 'firebird', 'C411629'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button => Select "Item barcode" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload a .csv file from Preconditions with valid Item barcodes by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 4: Click "Actions" menu => Check checkbox next to Item note type (e.g. "Action note")
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(ITEM_NOTE_TYPES.ACTION_NOTE);

        // Step 5: Check "Action note" column value for the Item
        BulkEditSearchPane.verifyResultsUnderColumns(ITEM_NOTE_TYPES.ACTION_NOTE, actionNoteText);

        // Step 6: Click "Actions" menu => Select "Download matched records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [instance.itemId]);

        // Step 7: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // Step 8: Select "Action note" option from "Select option" dropdown
        BulkEditActions.selectOption(ITEM_NOTE_TYPES.ACTION_NOTE);

        // Step 9: Select "Add note" option from "Select action" dropdown
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE);

        // Step 10: Fill in text area next to "Select action" dropdown with any text
        BulkEditActions.fillInSecondTextArea(additionalActionNoteText);
        BulkEditActions.verifyValueInSecondTextArea(additionalActionNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 12: Select new Item note type option from "Select option" dropdown
        BulkEditActions.selectOption(customNoteType, 1);

        // Step 13: Select "Add note" option from "Select action" dropdown
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE, 1);

        // Step 14: Fill in text area with any text with line breaks
        BulkEditActions.fillInSecondTextArea(customNoteText, 1);
        BulkEditActions.verifyValueInSecondTextArea(customNoteText, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 15: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          [instance.itemBarcode],
        );

        // Step 16: Check "Action note" column value for the Item in preview (if available)
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          `${actionNoteText} | ${additionalActionNoteText}`,
        );

        // Step 17: Check "New item note type" column value for the Item in preview (if available)
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.itemBarcode,
          customNoteType,
          customNoteText,
        );

        // Step 18: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          ITEM_NOTE_TYPES.ACTION_NOTE,
          `${actionNoteText} | ${additionalActionNoteText}`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          customNoteType,
          customNoteText,
        );

        // Step 19: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        // Step 20: Check "Action note" column value for the Item after commit
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          ITEM_NOTE_TYPES.ACTION_NOTE,
          `${actionNoteText} | ${additionalActionNoteText}`,
        );

        // Step 21: Check "New item note type" column value for the Item after commit
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          customNoteType,
          customNoteText,
        );

        // Step 22: Click "Actions" menu => Uncheck checkboxes next to note columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(ITEM_NOTE_TYPES.ACTION_NOTE, customNoteType);
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(ITEM_NOTE_TYPES.ACTION_NOTE);
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(customNoteType);

        // Step 23: Click the "Actions" menu => Select "Download changed records (CSV)" element
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          ITEM_NOTE_TYPES.ACTION_NOTE,
          `${actionNoteText} | ${additionalActionNoteText}`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          instance.itemId,
          customNoteType,
          customNoteText,
        );

        // Step 24: Navigate to "Inventory" app => Search for the recently edited Items => Verify that changes made have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);

        const notesToCheck = [
          {
            rowIndex: 0,
            staffOnly: 'No',
            noteType: ITEM_NOTE_TYPES.ACTION_NOTE,
            noteText: actionNoteText,
          },
          {
            rowIndex: 0,
            staffOnly: 'No',
            noteType: ITEM_NOTE_TYPES.ACTION_NOTE,
            noteText: additionalActionNoteText,
          },
          {
            rowIndex: 1,
            staffOnly: 'No',
            noteType: customNoteType,
            noteText: customNoteText,
          },
        ];

        notesToCheck.forEach((note) => {
          ItemRecordView.checkMultipleItemNotesWithStaffOnly(
            note.rowIndex,
            note.staffOnly,
            note.noteType,
            note.noteText,
          );
        });
      },
    );
  });
});
