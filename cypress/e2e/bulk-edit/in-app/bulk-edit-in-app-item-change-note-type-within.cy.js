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
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Circulation Notes',
          'Provenance',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.changeNoteType('Action note', 'Provenance', 0);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Check in note', 'Check out note', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Provenance', [
          `${notes.actionOne}(staff only)|${notes.actionTwo}`,
        ]);
        BulkEditActions.verifyChangesInAreYouSureForm('Circulation Notes', [
          `Check out;${notes.checkInOne};true`,
          `Check out;${notes.checkInTwo};false`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Provenance',
          `${notes.actionOne}(staff only)|${notes.actionTwo}`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Circulation Notes',
          `Check out;${notes.checkInOne};true`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Circulation Notes',
          `Check out;${notes.checkInTwo};false`,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `Provenance;${notes.actionOne};true|Provenance;${notes.actionTwo};false`,
          `Check out;${notes.checkInOne};true`,
          `Check out;${notes.checkInTwo};false`,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(`${notes.checkInOne}${notes.checkInTwo}`, 'Yes\nNo');
        ItemRecordView.checkItemNote(`${notes.actionOne}${notes.actionTwo}`, 'YesNo', 'Provenance');
      },
    );
  });
});
