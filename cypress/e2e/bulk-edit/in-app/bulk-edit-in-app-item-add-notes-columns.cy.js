import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let noteTypeId;
const actionNote = `actionNote-${getRandomPostfix()}`;
const newActionNote = `newActionNote-${getRandomPostfix()}`;
const noteType = `NoteType ${getRandomPostfix()}`;
const noteTypeText = 'NoteType\ntext';

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        ItemNoteTypes.createNoteTypeViaApi(noteType).then((noteId) => {
          noteTypeId = noteId;
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.notes = [
              {
                itemNoteTypeId: '0e40884c-3523-4c6d-8187-d578e3d2794e',
                note: actionNote,
                staffOnly: false,
              },
            ];
            cy.updateItemViaApi(itemData);
          },
        );
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ItemNoteTypes.deleteNoteTypeViaApi(noteTypeId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C411629 Verify separating notes in different columns - add notes (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note');
        BulkEditSearchPane.verifyResultsUnderColumns('Action note', actionNote);
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.addItemNote('Action note', newActionNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote(noteType, noteTypeText, 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note', noteType);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Action note',
          `${actionNote}|${newActionNote}`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns(noteType, noteTypeText);
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          actionNote,
          newActionNote,
          noteTypeText,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        const actionNotes = {
          note: `${actionNote}${newActionNote}`,
          type: 'Action note',
        };
        const newNoteType = {
          note: noteTypeText,
          type: noteType,
        };
        ItemRecordView.checkMultipleItemNotes(actionNotes, newNoteType);
      },
    );
  });
});
