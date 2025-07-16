import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
  actionOne: 'actionNote',
  actionTwo: 'ActionNote',
  checkInOne: 'checkInNote',
  checkInTwo: 'CheckInNote',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

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
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            item.hrid = res.hrid;

            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: notes.actionOne,
                staffOnly: true,
              },
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
                note: notes.actionTwo,
                staffOnly: false,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkInOne, staffOnly: true },
              { noteType: 'Check in', note: notes.checkInTwo, staffOnly: false },
            ];
            cy.updateItemViaApi(itemData);
          },
        );
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C405540 Verify Bulk Edit actions for Items notes - preserve the "Staff only" flag when change note type within the group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C405540'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Check out note',
          'Check in note',
          'Provenance note',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.changeNoteType('Action note', 'Provenance', 0);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Check in note', 'Check out note', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Provenance note', [
          `${notes.actionOne} (staff only) | ${notes.actionTwo}`,
        ]);
        BulkEditActions.verifyChangesInAreYouSureForm('Check out note', [
          `${notes.checkInOne} (staff only) | ${notes.checkInTwo}`,
        ]);
        BulkEditActions.verifyChangesInAreYouSureForm('Check in note', ['']);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Provenance note',
          `${notes.actionOne} (staff only) | ${notes.actionTwo}`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Check out note',
          `${notes.checkInOne} (staff only) | ${notes.checkInTwo}`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns('Check in note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,,${notes.actionOne} (staff only) | ${notes.actionTwo},,`,
          `${notes.checkInOne} (staff only) | ${notes.checkInTwo}`,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(`${notes.checkInOne}${notes.checkInTwo}`, 'YesNo');
        ItemRecordView.checkItemNote(`${notes.actionOne}${notes.actionTwo}`, 'YesNo', 'Provenance');
      },
    );
  });
});
