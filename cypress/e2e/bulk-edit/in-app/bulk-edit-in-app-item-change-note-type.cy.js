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
  admin: 'adminNote',
  action: 'actionNote',
  checkIn: 'checkInNote',
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${itemBarcodesFileName}`;
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
            ];
            itemData.circulationNotes = [
              { noteType: 'Check in', note: notes.checkIn, staffOnly: true },
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
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, changedRecordsFileName);
    });

    it(
      'C402336 Verify Bulk Edit actions for Items notes - change note type (firebird) (TaaS)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `${notes.admin},Action note;${notes.action};true,${notes.checkIn} (staff only)`,
        ]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Administrative note',
          'Provenance note',
          'Action note',
          'Electronic bookplate note',
          'Check in notes',
          'Check out notes',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyItemOptions();
        BulkEditActions.changeNoteType('Administrative note', 'Provenance');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Action note', 'Electronic bookplate', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Check in note', 'Check out note', 2);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,,Electronic bookplate;${notes.action};true|Provenance;${notes.admin};false,,${notes.checkIn} (staff only)`,
        ]);

        BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Provenance note', notes.admin);
        BulkEditSearchPane.verifyChangesUnderColumns('Check in notes', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Check out notes', notes.checkIn);
        BulkEditSearchPane.verifyChangesUnderColumns('Action note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Electronic bookplate note', notes.action);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(notes.checkIn);
        const action = {
          note: notes.action,
          type: 'Electronic bookplate',
        };
        const provenance = {
          note: notes.admin,
          type: 'Provenance',
        };
        ItemRecordView.checkMultipleItemNotes(action, provenance);
        ItemRecordView.checkItemAdministrativeNote('');
        ItemRecordView.verifyTextAbsent('Action note', 'Check in note');
      },
    );
  });
});
