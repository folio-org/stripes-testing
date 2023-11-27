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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

let user;
const notes = {
  admin: 'Te;st: [sample] no*te',
  action: 'Te;st: [sample] no*te',
  checkIn: 'Te;st: [sample] no*te',
  checkOut: 'Te;st: [sample] no*te',
  copy: 'Te;st: [sample] no*te',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;

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
            item.hrid = res.hrid;

            itemData.administrativeNotes = [notes.admin];

            itemData.notes = [
              {
                itemNoteTypeId: '0e40884c-3523-4c6d-8187-d578e3d2794e',
                note: notes.action,
                staffOnly: true,
              },
              {
                itemNoteTypeId: '1dde7141-ec8a-4dae-9825-49ce14c728e7',
                note: notes.copy,
                staffOnly: false,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkIn, staffOnly: true },
              { noteType: 'Check out', note: notes.checkOut, staffOnly: true },
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
    });

    it(
      'C402355 Verify Bulk Edit actions for Items notes - Find-Remove (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

        BulkEditSearchPane.uploadFile(itemHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Circulation Notes',
          'Administrative notes',
          'Copy note'
        );
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemAdminstrativeNoteActions();
        BulkEditActions.noteRemove('Administrative note', notes.admin);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemCheckInNoteActions(1);
        BulkEditActions.noteRemove('Check in note', notes.checkIn, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyItemNoteActions('Action note', 2);
        BulkEditActions.noteRemove('Action note', notes.action, 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Check out note', 'sample', 3);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemove('Copy note', 'sample', 4);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();

        BulkEditSearchPane.verifyChangesUnderColumns('Circulation Notes', `Check out;${notes.checkIn};true`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative notes', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', notes.copy);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(notes.checkOut, '-');
        ItemRecordView.checkItemNote(notes.copy, 'No', 'Copy note');
        ItemRecordView.verifyTextAbsent('Check in note');
        ItemRecordView.verifyTextAbsent('Action note');
        ItemRecordView.checkItemAdministrativeNote('-');
      },
    );
  });
});
