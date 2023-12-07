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
const notes = {
  checkInNote: 'CheckInNote',
  checkOutNote: 'CheckOutNote',
};

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
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: true },
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: false },
              { noteType: 'Check out', note: notes.checkOutNote, staffOnly: true },
              { noteType: 'Check out', note: notes.checkOutNote, staffOnly: false },
            ];
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
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
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C405535 Verify Bulk Edit actions for Items notes - duplicate check out note to check in note (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Circulation Notes');
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemCheckInNoteActions();
        BulkEditActions.duplicateCheckInNote('out');

        BulkEditActions.confirmChanges();
        const changes = [
          `Check in;${notes.checkInNote};true`,
          `Check in;${notes.checkInNote};false`,
          `Check out;${notes.checkOutNote};true`,
          `Check out;${notes.checkOutNote};false`,
          `Check in;${notes.checkOutNote};true`,
          `Check in;${notes.checkOutNote};false`,
        ];
        BulkEditActions.verifyChangesInAreYouSureForm('Circulation Notes', changes);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, changes);

        changes.forEach((value) => {
          BulkEditSearchPane.verifyChangesUnderColumns('Circulation Notes', value);
        });

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(
          `${notes.checkInNote}${notes.checkInNote}${notes.checkOutNote}${notes.checkOutNote}`,
          'Yes\nNo\nYes\nNo',
        );
        ItemRecordView.checkCheckOutNote(`${notes.checkOutNote}${notes.checkOutNote}`, 'Yes\nNo');
      },
    );
  });
});
