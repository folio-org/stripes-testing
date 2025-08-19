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

let user;
const notes = {
  adminOne: 'adminNote',
  adminTwo: 'AdminNote',
  actionOne: 'actionNote',
  actionTwo: 'ActionNote',
  checkInOne: 'checkInNote',
  checkInTwo: 'CheckInNote',
};
const newNotes = {
  adminNote: `adminNote-${getRandomPostfix()}`,
  actionNote: `actionNote-${getRandomPostfix()}`,
  checkInNote: `checkInNote-${getRandomPostfix()}`,
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
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
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            item.hrid = res.hrid;

            itemData.administrativeNotes = [notes.adminOne, notes.adminTwo];

            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: notes.actionOne,
                staffOnly: true,
              },
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: notes.actionTwo,
                staffOnly: true,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInOne, staffOnly: true },
              { noteType: 'Check in', note: notes.checkInTwo, staffOnly: true },
            ];
            cy.updateItemViaApi(itemData);
            FileManager.createFile(`cypress/fixtures/${itemHRIDsFileName}`, item.hrid);
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
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C402337 Verify Bulk Edit actions for Items notes - Find-Replace (firebird)',
      { tags: ['criticalPath', 'firebird', 'C402337'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Check in note',
          'Administrative note',
        );
        BulkEditActions.openStartBulkEditForm();

        BulkEditActions.noteReplaceWith('Administrative note', notes.adminTwo, newNotes.adminNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith('Check in note', notes.checkInTwo, newNotes.checkInNote, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith('Action note', notes.actionOne, newNotes.actionNote, 2);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          notes.adminOne,
          newNotes.adminNote,
          notes.actionTwo,
          newNotes.actionNote,
          notes.checkInOne,
          newNotes.checkInNote,
        ]);

        BulkEditSearchPane.verifyChangesUnderColumns('Check in note', notes.checkInOne);
        BulkEditSearchPane.verifyChangesUnderColumns('Check in note', newNotes.checkInNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', notes.adminOne);
        BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', newNotes.adminNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', notes.actionTwo);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', newNotes.actionNote);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(`${notes.checkInOne}${newNotes.checkInNote}`);
        ItemRecordView.checkItemNote(
          `${newNotes.actionNote}${notes.actionTwo}`,
          'YesYes',
          'Action note',
        );
        ItemRecordView.checkItemAdministrativeNote(notes.adminOne);
        ItemRecordView.checkItemAdministrativeNote(newNotes.adminNote);
      },
    );
  });
});
