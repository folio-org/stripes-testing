import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
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
  ITEM_NOTES,
  LOAN_TYPE_IDS,
  LOCATION_IDS,
} from '../../../support/constants';

let user;
const notes = {
  checkInNote: 'checkInNote',
  noteNote: 'noteNote',
  admin: 'adminNote',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `AT_C430250_FolioInstance_${getRandomPostfix()}`,
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            item.itemId = res.id;
            item.hrid = res.hrid;
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: false },
            ];
            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.NOTE_NOTE,
                note: notes.noteNote,
                staffOnly: true,
              },
            ];
            itemData.temporaryLoanType = { id: LOAN_TYPE_IDS.SELECTED };
            itemData.permanentLocation = { id: LOCATION_IDS.ANNEX };
            itemData.temporaryLocation = { id: LOCATION_IDS.ANNEX };
            itemData.discoverySuppress = true;
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.itemId);
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
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C430250 Verify updated properties columns appear on "Are you sure?" form and on Confirmation screen - Items (firebird)',
      { tags: ['criticalPath', 'firebird', 'C430250'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.barcode]);

        const columnNames = [
          'Check out note',
          'Check in note',
          'Suppress from discovery',
          'Administrative note',
          'Note',
          'Status',
          'Permanent loan type',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
        ];

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...columnNames);
        BulkEditSearchPane.changeShowColumnCheckbox(...columnNames);

        columnNames.forEach((column) => {
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(column);
        });

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.addItemNote('Administrative note', notes.admin);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.duplicateCheckInNote('in', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.markAsStaffOnly('Note', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceItemStatus('Available', 3);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillPermanentLoanType('Reading room', 4);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLoanType(5);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation('Online (E)', 'item', 6);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLocation('item', 7);
        BulkEditActions.addNewBulkEditFilterString();

        const suppressFromDiscovery = false;

        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 8);
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: notes.admin,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: notes.checkInNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: notes.checkInNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NOTE,
            value: `${notes.noteNote} (staff only)`,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            value: 'Reading room',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            value: 'Online',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
            value: 'Available',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            value: suppressFromDiscovery,
          },
        ];

        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          item.itemId,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.noteNote} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Status', 'Available');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Permanent loan type', 'Reading room');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Temporary loan type', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item permanent location', 'Online');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item temporary location', '');

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.noteNote} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Status', 'Available');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Permanent loan type', 'Reading room');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Temporary loan type', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item permanent location', 'Online');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item temporary location', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          item.itemId,
          editedHeaderValues,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(notes.admin);
        ItemRecordView.checkCheckInNote(notes.checkInNote, 'No');
        ItemRecordView.checkCheckOutNote(notes.checkInNote, 'No');
        ItemRecordView.checkItemNote(notes.noteNote);
        ItemRecordView.verifyItemStatus('Available');
        ItemRecordView.verifyPermanentLoanType('Reading room');
        ItemRecordView.verifyTemporaryLoanType('No value set-');
        ItemRecordView.verifyPermanentLocation('Online');
        ItemRecordView.verifyTemporaryLocation('No value set-');
      },
    );
  });
});
