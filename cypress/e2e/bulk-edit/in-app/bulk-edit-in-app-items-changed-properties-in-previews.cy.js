import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const notes = {
  checkInNote: 'CheckInNote',
  checkOutNote: 'CheckOutNote',
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.itemId = res.id;
            res.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInNote, staffOnly: false },
            ];
            cy.updateItemViaApi(res);
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
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C430261 Verify only changed properties columns appear on "Are you sure?" form and on Confirmation screen - Items (firebird)',
      { tags: ['criticalPath', 'firebird', 'C430261'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.barcode]);
        let columnNames = [
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
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.noteRemoveAll('Administrative note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.duplicateCheckInNote('in', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Note', 'Copy note', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceItemStatus('Intellectual item', 3);
        BulkEditActions.addNewBulkEditFilterString();
        const type = 'Selected';
        BulkEditActions.fillPermanentLoanType(type, 4);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillTemporaryLoanType(type, 5);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearPermanentLocation('item', 6);
        BulkEditActions.addNewBulkEditFilterString();
        const location = 'Online';
        BulkEditActions.replaceTemporaryLocation(location, 'item', 7);
        BulkEditActions.addNewBulkEditFilterString();
        const suppressFromDiscovery = true;
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 8);

        BulkEditActions.deleteRow(0);
        BulkEditActions.deleteRow(1);
        BulkEditActions.deleteRow(1);
        BulkEditActions.deleteRow(2);
        BulkEditActions.deleteRow(2);
        BulkEditActions.deleteRow(2);
        BulkEditActions.deleteRow(2);

        BulkEditActions.confirmChanges();
        columnNames = [
          'Suppress from discovery',
          'Administrative note',
          'Note',
          'Status',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
        ];
        columnNames.forEach((column) => {
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(column);
        });
        BulkEditSearchPane.verifyExactChangesUnderColumns('Permanent loan type', type);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', notes.checkInNote);

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        columnNames.forEach((column) => {
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(column);
        });
        BulkEditSearchPane.verifyExactChangesUnderColumns('Permanent loan type', type);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', notes.checkInNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in note', notes.checkInNote);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(notes.checkInNote, 'No');
        ItemRecordView.checkCheckOutNote(notes.checkInNote, 'No');
        ItemRecordView.verifyPermanentLoanType(type);
      },
    );
  });
});
