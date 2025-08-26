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
import { ITEM_NOTES, MATERIAL_TYPE_IDS } from '../../../support/constants';

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
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
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
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            item.hrid = res.hrid;

            itemData.administrativeNotes = [notes.admin];
            res.materialType = {
              id: MATERIAL_TYPE_IDS.DVD,
              name: 'dvd',
            };
            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ACTION_NOTE,
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
      { tags: ['criticalPath', 'firebird', 'C402336'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,${notes.admin},dvd,`,
          `,${notes.action} (staff only),`,
          `,${notes.checkIn} (staff only),`,
        ]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Administrative note',
          'Provenance note',
          'Action note',
          'Electronic bookplate note',
          'Check in note',
          'Check out note',
        );
        BulkEditActions.openStartBulkEditForm();
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
          ',,dvd,',
          `,${notes.action} (staff only),,${notes.admin},,`,
          `Available,,${notes.checkIn} (staff only),,`,
        ]);

        BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Provenance note', notes.admin);
        BulkEditSearchPane.verifyChangesUnderColumns('Check in note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Check out note', notes.checkIn);
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
