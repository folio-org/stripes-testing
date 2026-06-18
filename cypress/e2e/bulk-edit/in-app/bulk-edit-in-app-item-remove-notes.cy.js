import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let copyNoteTypeId;
let electronicBookplateNoteTypeId;
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

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.getItemNoteTypes({ query: 'name="Copy note"' }).then((noteTypes) => {
          copyNoteTypeId = noteTypes[0].id;
        });
        InventoryInstances.getItemNoteTypes({ query: 'name="Electronic bookplate"' }).then(
          (noteTypes) => {
            electronicBookplateNoteTypeId = noteTypes[0].id;

            InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
            cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
              (res) => {
                const itemData = res;
                item.hrid = res.hrid;

                itemData.notes = [
                  {
                    itemNoteTypeId: copyNoteTypeId,
                    note: notes.copyNote,
                    staffOnly: false,
                  },
                  {
                    itemNoteTypeId: copyNoteTypeId,
                    note: notes.copyNoteStaffOnly,
                    staffOnly: true,
                  },
                  {
                    itemNoteTypeId: electronicBookplateNoteTypeId,
                    note: notes.electronicBookplateNote,
                    staffOnly: false,
                  },
                  {
                    itemNoteTypeId: electronicBookplateNoteTypeId,
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
          },
        );
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
      { tags: ['criticalPath', 'firebird', 'C411645'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Copy note',
          'Electronic bookplate note',
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Copy note',
          `${notes.copyNote} | ${notes.copyNoteStaffOnly} (staff only)`,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Electronic bookplate note',
          `${notes.electronicBookplateNote} | ${notes.electronicBookplateNoteStaffOnly} (staff only)`,
        );
        BulkEditActions.openStartBulkEditForm();

        BulkEditActions.noteRemove('Copy note', notes.copyNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Electronic bookplate', 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Copy note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTextAbsent('Copy note');
        ItemRecordView.verifyTextAbsent('Electronic bookplate note');
        ItemRecordView.verifyTextAbsent(notes.copyNote);
        ItemRecordView.verifyTextAbsent(notes.copyNoteStaffOnly);
        ItemRecordView.verifyTextAbsent(notes.electronicBookplateNote);
        ItemRecordView.verifyTextAbsent(notes.electronicBookplateNoteStaffOnly);
      },
    );
  });
});
