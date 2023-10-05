import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

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
const changedRecordsFileName = `*-Changed-Records-${itemHRIDsFileName}`;

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
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            item.hrid = res.hrid;

            itemData.administrativeNotes = [notes.adminOne, notes.adminTwo];

            itemData.notes = [
              {
                itemNoteTypeId: '0e40884c-3523-4c6d-8187-d578e3d2794e',
                note: notes.actionOne,
                staffOnly: true,
              },
              {
                itemNoteTypeId: '0e40884c-3523-4c6d-8187-d578e3d2794e',
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
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C402337 Verify Bulk Edit actions for Items notes - Find-Replace (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Action note', 'Circulation Notes', 'Administrative notes');
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.noteReplaceWith('Administrative note', notes.adminTwo, newNotes.adminNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemCheckInNoteActions(1);
        BulkEditActions.noteReplaceWith('Check in note', notes.checkInTwo, newNotes.checkInNote, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemNoteActions('Action note', 2);
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

        BulkEditSearchPane.verifyChangesUnderColumns('Circulation Notes', notes.checkInOne);
        BulkEditSearchPane.verifyChangesUnderColumns('Circulation Notes', newNotes.checkInNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Administrative notes', notes.adminOne);
        BulkEditSearchPane.verifyChangesUnderColumns('Administrative notes', newNotes.adminNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', notes.actionTwo);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', newNotes.actionNote);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(`${notes.checkInOne}${newNotes.checkInNote}`);
        ItemRecordView.checkItemNote(`${newNotes.actionNote}${notes.actionTwo}`, 'YesYes', 'Action note');
        ItemRecordView.checkItemAdministrativeNote(notes.adminOne);
        ItemRecordView.checkItemAdministrativeNote(newNotes.adminNote);
      },
    );
  });
});
