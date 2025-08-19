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
  bindingNote: `binding-note-${getRandomPostfix()}`,
  noteNote: `note-note-${getRandomPostfix()}`,
  copyNote: `copy-note-${getRandomPostfix()}`,
  // eslint-disable-next-line no-useless-escape
  electronicBookplateNote: `~,!,@,#,$,%,^,&,*,(,),~\",', {.[,]<},>,ø, Æ, §,;-${getRandomPostfix()}`,
  newElectronicBookplateNote: `Item note with special characters-${getRandomPostfix()}`,
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
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.BINDING_NOTE,
                note: notes.bindingNote,
                staffOnly: true,
              },
              {
                itemNoteTypeId: ITEM_NOTES.NOTE_NOTE,
                note: notes.noteNote,
                staffOnly: true,
              },
              {
                itemNoteTypeId: ITEM_NOTES.COPY_NOTE,
                note: notes.copyNote,
                staffOnly: false,
              },
              {
                itemNoteTypeId: ITEM_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                note: notes.electronicBookplateNote,
                staffOnly: false,
              },
            ];
            cy.updateItemViaApi(itemData);
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
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C411639 Verify separating notes in different columns - edit notes (firebird)',
      { tags: ['criticalPath', 'firebird', 'C411639'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Binding note',
          'Note',
          'Copy note',
          'Electronic bookplate note',
          'Provenance note',
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Binding note',
          `${notes.bindingNote} (staff only)`,
        );
        BulkEditSearchPane.verifyResultsUnderColumns('Note', `${notes.noteNote} (staff only)`);
        BulkEditSearchPane.verifyResultsUnderColumns('Copy note', notes.copyNote);
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Electronic bookplate note',
          notes.electronicBookplateNote,
        );
        BulkEditActions.openStartBulkEditForm();

        BulkEditActions.removeMarkAsStaffOnly('Binding');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Note', 'Provenance', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.markAsStaffOnly('Copy note', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith(
          'Electronic bookplate',
          notes.electronicBookplateNote,
          notes.newElectronicBookplateNote,
          3,
        );

        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyChangesUnderColumns('Binding note', notes.bindingNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Note', '');
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Provenance note',
          `${notes.noteNote} (staff only)`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns('Copy note', `${notes.copyNote} (staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Electronic bookplate note',
          notes.newElectronicBookplateNote,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyChangesUnderColumns('Binding note', notes.bindingNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Note', '');
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Provenance note',
          `${notes.noteNote} (staff only)`,
        );
        BulkEditSearchPane.verifyChangesUnderColumns('Copy note', `${notes.copyNote} (staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Electronic bookplate note',
          notes.newElectronicBookplateNote,
        );
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          notes.bindingNote,
          notes.noteNote,
          notes.copyNote,
          notes.newElectronicBookplateNote,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        const bindingNote = {
          note: notes.bindingNote,
          type: 'Binding',
        };
        const provenanceNote = {
          note: notes.noteNote,
          type: 'Provenance',
        };
        const copyNote = {
          note: notes.copyNote,
          type: 'Copy note',
        };
        const electronicBookplateNote = {
          note: notes.newElectronicBookplateNote,
          type: 'Electronic bookplate',
        };
        ItemRecordView.checkMultipleItemNotes(
          bindingNote,
          provenanceNote,
          copyNote,
          electronicBookplateNote,
        );
      },
    );
  });
});
