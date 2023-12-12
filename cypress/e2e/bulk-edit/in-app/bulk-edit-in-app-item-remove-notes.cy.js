import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
  copyNote: 'copy-note-test',
  copyNoteStaffOnly: 'copy-note-test',
  electronicBookplateNote: `electronic-bookplate-note-${getRandomPostfix()}`,
  electronicBookplateNoteStaffOnly: `electronic-bookplate-note-StaffOnly${getRandomPostfix()}`,
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

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
            item.hrid = res.hrid;

            itemData.notes = [
              {
                // "Copy note" Item note type
                itemNoteTypeId: '1dde7141-ec8a-4dae-9825-49ce14c728e7',
                note: notes.copyNote,
                staffOnly: false,
              },
              {
                // "Copy note" Item note type staffOnly
                itemNoteTypeId: '1dde7141-ec8a-4dae-9825-49ce14c728e7',
                note: notes.copyNoteStaffOnly,
                staffOnly: true,
              },
              {
                // "Electronic bookplate" Item note type
                itemNoteTypeId: 'f3ae3823-d096-4c65-8734-0c1efd2ffea8',
                note: notes.electronicBookplateNote,
                staffOnly: false,
              },
              {
                // "Electronic bookplate" Item note type staffOnly
                itemNoteTypeId: 'f3ae3823-d096-4c65-8734-0c1efd2ffea8',
                note: notes.electronicBookplateNoteStaffOnly,
                staffOnly: true,
              },
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
    });

    it(
      'C411645 Verify separating notes in different columns - remove notes (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Copy note', 'Electronic bookplate');
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Copy note',
          `${notes.copyNote}|${notes.copyNoteStaffOnly}(staff only)`,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Electronic bookplate',
          `${notes.electronicBookplateNote}|${notes.electronicBookplateNoteStaffOnly}(staff only)`,
        );
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.noteRemove('Copy note', notes.copyNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Electronic bookplate', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate', '');

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemNote('-', '-');
      },
    );
  });
});
