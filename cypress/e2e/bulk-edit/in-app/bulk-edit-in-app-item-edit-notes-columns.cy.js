import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

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
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
                // "Binding" Item note type
                itemNoteTypeId: '87c450be-2033-41fb-80ba-dd2409883681',
                note: notes.bindingNote,
                staffOnly: true,
              },
              {
                // "Note" Item note type
                itemNoteTypeId: '8d0a5eca-25de-4391-81a9-236eeefdd20b',
                note: notes.noteNote,
                staffOnly: true,
              },
              {
                // "Copy note" Item note type
                itemNoteTypeId: '1dde7141-ec8a-4dae-9825-49ce14c728e7',
                note: notes.copyNote,
                staffOnly: false,
              },
              {
                // "Electronic bookplate" Item note type
                itemNoteTypeId: 'f3ae3823-d096-4c65-8734-0c1efd2ffea8',
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
      { tags: ['criticalPath', 'firebird', 'system'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Binding',
          'Note',
          'Copy note',
          'Electronic bookplate',
          'Provenance',
        );
        BulkEditSearchPane.verifyResultsUnderColumns('Binding', `${notes.bindingNote}(staff only)`);
        BulkEditSearchPane.verifyResultsUnderColumns('Note', `${notes.noteNote}(staff only)`);
        BulkEditSearchPane.verifyResultsUnderColumns('Copy note', notes.copyNote);
        BulkEditSearchPane.verifyResultsUnderColumns(
          'Electronic bookplate',
          notes.electronicBookplateNote,
        );
        BulkEditActions.openInAppStartBulkEditFrom();

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
        BulkEditSearchPane.verifyChangesUnderColumns('Binding', notes.bindingNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Provenance', `${notes.noteNote}(staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns('Copy note', `${notes.copyNote}(staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Electronic bookplate',
          notes.newElectronicBookplateNote,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyChangesUnderColumns('Binding', notes.bindingNote);
        BulkEditSearchPane.verifyChangesUnderColumns('Note', '');
        BulkEditSearchPane.verifyChangesUnderColumns('Provenance', `${notes.noteNote}(staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns('Copy note', `${notes.copyNote}(staff only)`);
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Electronic bookplate',
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
