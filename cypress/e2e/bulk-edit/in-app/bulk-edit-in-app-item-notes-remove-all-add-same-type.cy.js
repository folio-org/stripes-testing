import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_NOTES,
  MATERIAL_TYPE_IDS,
} from '../../../support/constants';

let user;
const notes = {
  admin: 'Admin_Note_text',
  copy: 'copy-Note_text',
  electronicBookplate: 'electronicBookplate-Note_text',
  checkIn: 'checkIn-Note_text',
  checkOut: 'checkOut-Note_text',
  action: 'action-Note_text',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemHRIDsFileName);
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
            item.hrid = res.hrid;
            res.administrativeNotes = [notes.admin];
            res.materialType = {
              id: MATERIAL_TYPE_IDS.DVD,
              name: 'dvd',
            };
            res.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.COPY_NOTE,
                note: notes.copy,
                staffOnly: false,
              },
              {
                itemNoteTypeId: ITEM_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                note: notes.electronicBookplate,
                staffOnly: false,
              },
            ];
            res.circulationNotes = [
              { noteType: 'Check in', note: notes.checkIn, staffOnly: false },
              { noteType: 'Check out', note: notes.checkOut, staffOnly: false },
            ];
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
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C400674 Verify Bulk Edit actions for Items notes - Remove all and Add the same type (firebird)',
      { tags: ['criticalPath', 'firebird', 'C400674'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          item.hrid,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: notes.admin,
            },
            { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE, value: notes.copy },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
              value: notes.electronicBookplate,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: notes.checkIn,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: notes.checkOut,
            },
          ],
        );
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Administrative note',
          'Copy note',
          'Electronic bookplate note',
          'Check in note',
          'Check out note',
          'Action note',
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.noteRemoveAll('Administrative note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Check in note', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Copy note', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Check out note', 3);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Action note', notes.action, 4);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Electronic bookplate note', [
          notes.electronicBookplate,
        ]);
        BulkEditActions.downloadPreview();

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: '',
          },
          { header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE, value: '' },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
            value: notes.electronicBookplate,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: notes.action,
          },
        ];

        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          item.hrid,
          editedHeaderValues,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Electronic bookplate note',
          notes.electronicBookplate,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          item.hrid,
          editedHeaderValues,
        );

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        [notes.admin, 'Copy note', 'Check in note', 'Check out note'].forEach((text) => {
          ItemRecordView.verifyTextAbsent(text);
        });
        const electronicBookplateNote = {
          note: notes.electronicBookplate,
          type: 'Electronic bookplate',
        };
        const actionNote = {
          note: notes.action,
          type: 'Action note',
        };
        ItemRecordView.checkMultipleItemNotes(electronicBookplateNote, actionNote);
      },
    );
  });
});
