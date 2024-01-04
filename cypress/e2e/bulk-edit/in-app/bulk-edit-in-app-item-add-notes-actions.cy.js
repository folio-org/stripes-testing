import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const firstNote = {
  bulkEdit: 'first\nnote',
  inventory: 'first note',
};
const secondNote = 'secondNote~!@#$%^&*()~{.[]<}>øÆ§';
const thirdNote = 'third note';

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
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.inventoryCRUDItemNoteTypes.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
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
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C400662 Verify Bulk Edit actions for Items notes - add notes (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.addItemNote('Administrative note', firstNote.bulkEdit);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemCheckInNoteActions(1);
        BulkEditActions.addItemNote('Check in note', secondNote, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemNoteActions('Note', 2);
        BulkEditActions.addItemNote('Note', thirdNote, 2);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          'Administrative notes',
          'Note',
          'Circulation Notes',
        );
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          firstNote.bulkEdit,
          secondNote,
          thirdNote,
        ]);

        BulkEditSearchPane.verifyChangesUnderColumns('Administrative notes', firstNote.bulkEdit);
        BulkEditSearchPane.verifyChangesUnderColumns('Circulation Notes', secondNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Note', thirdNote);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(firstNote.inventory);
        ItemRecordView.checkCheckInNote(secondNote, 'No');
        ItemRecordView.checkItemNote(thirdNote, 'No');
      },
    );
  });
});
