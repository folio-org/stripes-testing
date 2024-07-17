import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_NOTES, LOAN_TYPE_IDS, LOCATION_IDS } from '../../../support/constants';

let user;
const notes = {
  checkInNote: 'checkInNote',
  noteNote: 'noteNote',
  admin: 'adminNote',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${itemUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C430250 Verify updated properties columns appear on "Are you sure?" form and on Confirmation screen - Items (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Check out notes',
          'Check in notes',
          'Suppress from discovery',
          'Administrative note',
          'Note',
          'Status',
          'Permanent loan type',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
        );
        cy.log('SHREK');
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          'Check out notes',
          'Check in notes',
          'Suppress from discovery',
          'Administrative note',
          'Note',
          'Status',
          'Permanent loan type',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
        );
        [
          'Check out notes',
          'Check in notes',
          'Suppress from discovery',
          'Administrative note',
          'Note',
          'Status',
          'Permanent loan type',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
        ].forEach((column) => {
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(column);
        });
        BulkEditActions.openInAppStartBulkEditFrom();
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
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditActions.verifyChangesInAreYouSureForm('Check out notes', notes.checkOutNote);
        BulkEditActions.verifyChangesInAreYouSureForm('Check in notes', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.noteNote} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Status', 'Available');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Permanent loan type', 'Reading room');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Temporary loan type', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item permanent location', 'Online (E)');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Item temporary location', '');

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
      },
    );
  });
});
