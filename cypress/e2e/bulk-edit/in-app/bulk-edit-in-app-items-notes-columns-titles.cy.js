import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
  BULK_EDIT_ACTIONS,
} from '../../../support/constants';

let user;
let instance;
let itemHRIDsFileName;
let fileNames;
const notes = {
  administrative: 'C423588 Administrative\n note text',
  binding: "C423588 ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,;",
  electronicBookplate: 'C423588 Electronic bookplate note text',
  provenance: 'C423588 Provenance note text',
  reproduction: 'C423588 Reproduction note text',
};
const administrativeNoteActionOptions = [
  BULK_EDIT_ACTIONS.ADD_NOTE,
  BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
  BULK_EDIT_ACTIONS.FIND,
  BULK_EDIT_ACTIONS.REMOVE_ALL,
];
const itemNoteActionOptions = [
  BULK_EDIT_ACTIONS.ADD_NOTE,
  BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
  BULK_EDIT_ACTIONS.FIND,
  BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
  BULK_EDIT_ACTIONS.REMOVE_ALL,
  BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
];
const headerValues = [
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
    value: notes.administrative,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
    value: '',
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
    value: notes.binding,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
    value: '',
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
    value: notes.electronicBookplate,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NOTE,
    value: '',
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PROVENANCE_NOTE,
    value: notes.provenance,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.REPRODUCTION_NOTE,
    value: notes.reproduction,
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
    value: '',
  },
  {
    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
    value: '',
  },
];

function addNoteInBulkEdit(rowNumber, itemNoteType, noteText) {
  BulkEditActions.addNewBulkEditFilterString();
  BulkEditActions.verifyNewBulkEditRow(rowNumber);
  BulkEditActions.selectOption(itemNoteType, rowNumber);
  BulkEditActions.verifyTheActionOptions(itemNoteActionOptions, rowNumber);
  BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE, rowNumber);
  BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE, rowNumber);
  BulkEditActions.fillInFirstTextArea(noteText, rowNumber);
  BulkEditActions.verifyValueInFirstTextArea(noteText, rowNumber);
  BulkEditActions.verifyConfirmButtonDisabled(false);
}

describe('Bulk-edit', () => {
  describe(
    'In-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        instance = {
          title: `AT_C423588_FolioInstance_${getRandomPostfix()}`,
          itemBarcode: getRandomPostfix(),
        };
        itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(itemHRIDsFileName);
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          instance.instanceId = InventoryInstances.createInstanceViaApi(
            instance.title,
            instance.itemBarcode,
          );
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${instance.itemBarcode}"`,
          }).then((item) => {
            instance.itemHRID = item.hrid;
            instance.itemUUID = item.id;

            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C423588 Verify Bulk Edit actions for Items notes - columns titles (firebird)',
        { tags: ['extendedPath', 'firebird', 'C423588'] },
        () => {
          // Step 1: Select the "Inventory - items" radio button on the "Record types" accordion => Select "Item HRIDs" option from the "Record identifier" dropdown
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item HRIDs');

          // Step 2: Upload a .csv file from Preconditions with valid Item HRIDs by dragging it on the "Drag & drop" area
          BulkEditSearchPane.uploadFile(itemHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check the result of uploading the .csv file with Items HRIDs
          BulkEditSearchPane.verifyMatchedResults(instance.itemHRID);

          // Step 4: Click "Actions" menu => Fill into the search box "note"
          BulkEditActions.openActions();
          BulkEditSearchPane.searchColumnName('note');
          cy.wait(1000);

          // Step 5: Check checkboxes next to note columns
          headerValues.forEach((headerValue) => {
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(headerValue.header);
            BulkEditSearchPane.verifyResultsUnderColumns(headerValue.header, '');
          });

          // Step 6: Click "Actions" menu => Select "Download matched records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          headerValues.forEach((headerValue) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instance.itemUUID,
              headerValue.header,
              '',
            );
          });

          // Step 7: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();

          // Step 8: Click "Select option" dropdown in "Options" column under "Bulk edits" accordion
          BulkEditActions.verifyGroupOptionsInSelectOptionsDropdown('item');

          // Step 9: Select "Administrative note" option from "Select option" dropdown
          BulkEditActions.selectOption(ITEM_NOTE_TYPES.ADMINISTRATIVE_NOTE);

          // Step 10: Click "Select action" dropdown in "Actions" column
          BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);

          // Step 11: Select "Add note" option from "Select action" dropdown
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
          BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE);

          // Step 12: Fill in text area next to "Select action" dropdown with any text with line breaks
          BulkEditActions.fillInFirstTextArea(notes.administrative);
          BulkEditActions.verifyValueInFirstTextArea(notes.administrative);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Click on the "Plus" icon
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 14: Select "Binding" option from "Select option" dropdown
          BulkEditActions.selectOption(ITEM_NOTE_TYPES.BINDING, 1);

          // Step 15: Click "Select action" dropdown in "Actions" column
          BulkEditActions.verifyTheActionOptions(itemNoteActionOptions, 1);

          // Step 16: Select "Add note" option from "Select action" dropdown
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE, 1);
          BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE, 1);

          // Step 17: Fill in text area with Extended ASCII characters
          BulkEditActions.fillInFirstTextArea(notes.binding, 1);
          BulkEditActions.verifyValueInFirstTextArea(notes.binding, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 18-23: Click on the "Plus" icon => Select note option
          const notesToAdd = [
            {
              type: ITEM_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
              text: notes.electronicBookplate,
              fieldIndex: 2,
            },
            {
              type: ITEM_NOTE_TYPES.PROVENANCE,
              text: notes.provenance,
              fieldIndex: 3,
            },
            {
              type: ITEM_NOTE_TYPES.REPRODUCTION,
              text: notes.reproduction,
              fieldIndex: 4,
            },
          ];

          notesToAdd.forEach((note) => {
            addNoteInBulkEdit(note.fieldIndex, note.type, note.text);
            cy.wait(500);
          });

          // Step 24: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            instance.itemHRID,
            headerValues,
          );

          // Step 25: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            instance.itemHRID,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            instance.itemHRID,
            headerValues,
          );

          // Step 26: Click the "Actions" menu => Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            instance.itemUUID,
            headerValues,
          );

          // Step 27: Navigate to "Inventory" app => Search for the recently edited Items => Verify that changes made have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemAdministrativeNote('C423588 Administrative note text');

          const notesToCheck = [
            {
              staffOnly: 'No',
              noteType: ITEM_NOTE_TYPES.BINDING,
              noteText: notes.binding,
            },
            {
              staffOnly: 'No',
              noteType: ITEM_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
              noteText: notes.electronicBookplate,
            },
            {
              staffOnly: 'No',
              noteType: ITEM_NOTE_TYPES.PROVENANCE,
              noteText: notes.provenance,
            },
            {
              staffOnly: 'No',
              noteType: ITEM_NOTE_TYPES.REPRODUCTION,
              noteText: notes.reproduction,
            },
          ];

          notesToCheck.forEach((note, index) => {
            ItemRecordView.checkMultipleItemNotesWithStaffOnly(
              index,
              note.staffOnly,
              note.noteType,
              note.noteText,
            );
          });
        },
      );
    },
  );
});
