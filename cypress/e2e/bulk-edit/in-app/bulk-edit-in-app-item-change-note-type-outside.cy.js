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
  copyOne: 'copyNote',
  copyTwo: 'copyNote',
  checkOutOne: 'checkOutNote',
  checkOutTwo: 'CheckOutNote',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);
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
                itemNoteTypeId: ITEM_NOTES.COPY_NOTE,
                note: notes.copyOne,
                staffOnly: true,
              },
              {
                itemNoteTypeId: ITEM_NOTES.COPY_NOTE,
                note: notes.copyTwo,
                staffOnly: false,
              },
            ];
            itemData.circulationNotes = [
              { noteType: 'Check out', note: notes.checkOutOne, staffOnly: true },
              { noteType: 'Check out', note: notes.checkOutTwo, staffOnly: false },
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
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C405542 Verify Bulk Edit actions for Items notes - preserve the "Staff only" flag when change note type to other group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C405542'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,,,${notes.copyOne} (staff only) | ${notes.copyTwo},,,,,`,
          `Available,,${notes.checkOutOne} (staff only) | ${notes.checkOutTwo},`,
        ]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Copy note',
          'Check out note',
          'Check in note',
          'Binding note',
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.changeNoteType('Check out note', 'Binding');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Copy note', 'Check in note', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,,${notes.checkOutOne} (staff only) | ${notes.checkOutTwo},,,,,,`,
          `Available,${notes.copyOne} (staff only) | ${notes.copyTwo}`,
        ]);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Check in note',
          `${notes.copyOne} (staff only) | ${notes.copyTwo}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Binding note',
          `${notes.checkOutOne} (staff only) | ${notes.checkOutTwo}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', '');
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Check in note',
          `${notes.copyOne} (staff only) | ${notes.copyTwo}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Binding note',
          `${notes.checkOutOne} (staff only) | ${notes.checkOutTwo}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check out note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,,${notes.checkOutOne} (staff only) | ${notes.checkOutTwo},,,,,,`,
          `Available,${notes.copyOne} (staff only) | ${notes.copyTwo}`,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckInNote(`${notes.copyOne}${notes.copyTwo}`, 'YesNo');
        ItemRecordView.checkItemNote(
          `${notes.checkOutOne}${notes.checkOutTwo}`,
          'YesNo',
          'Binding',
        );
        ItemRecordView.verifyTextAbsent('Check out note');
        ItemRecordView.verifyTextAbsent('Copy note');
      },
    );
  });
});
