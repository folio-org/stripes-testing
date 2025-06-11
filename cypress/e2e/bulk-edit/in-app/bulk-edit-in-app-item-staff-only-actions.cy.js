import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
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
import { ITEM_NOTES } from '../../../support/constants';

// TODO: Update autotest after UIBULKED-329 gets done

let user;
const checkInNote = `checkIn-${getRandomPostfix()}`;
const checkOutNote = `checkOut-${getRandomPostfix()}`;
const actionNote = `actionNote-${getRandomPostfix()}`;

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName);

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
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            // Adding check in note, check out note and action note
            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: actionNote,
                staffOnly: false,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: checkInNote, staffOnly: false },
              { noteType: 'Check out', note: checkOutNote, staffOnly: false },
            ];
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, res.id);
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
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C400670 Verify Bulk Edit actions for Items notes - mark Staff only (firebird)',
      { tags: ['criticalPath', 'firebird', 'C400670'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemCheckInNoteActions();
        BulkEditActions.markAsStaffOnly('Check in note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemNoteActions('Action note', 1);
        BulkEditActions.markAsStaffOnly('Action note', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.markAsStaffOnly('Check out note', 2);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Check out note',
          'Check in note',
        );
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          actionNote,
          checkInNote,
          checkOutNote,
        ]);

        BulkEditSearchPane.verifyChangesUnderColumns('Check in note', checkInNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Check out note', checkOutNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', actionNote);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(checkInNote);
        ItemRecordView.checkCheckOutNote(checkOutNote);
        ItemRecordView.checkItemNote(actionNote, 'Yes', 'Action note');
      },
    );
  });
});
