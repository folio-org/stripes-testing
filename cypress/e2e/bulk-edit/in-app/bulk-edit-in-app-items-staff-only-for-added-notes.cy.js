import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { ITEM_NOTES } from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${itemUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${itemUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${itemUUIDsFileName}`;
const notes = {
  electronicBookplate: 'electronicBookplateNote',
  admin: 'adminNote',
  action: 'actionNote',
  binding: 'bindingNote',
  copy: 'copyNote',
  note: 'noteNote',
  provenance: 'provenanceNote',
  reproduction: 'reproductionNote',
  checkIn: 'checkInNote',
  checkOut: 'checkOutNote',
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
          (res) => {
            item.itemId = res.id;
            item.hrid = res.hrid;
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.itemId);
            res.notes = [
              {
                itemNoteTypeId: ITEM_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                note: notes.electronicBookplate,
                staffOnly: false,
              },
            ];
            cy.updateItemViaApi(res);
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466282 Verify Staff only checkbox for Added notes - items (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemId]);
        BulkEditSearchPane.verifyMatchedResults(item.hrid);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.addItemNote('Administrative note', notes.admin);
        BulkEditActions.verifyCheckboxAbsent();
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Check in note', 1);
        BulkEditActions.selectSecondAction('Add note', 1);
        BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
        BulkEditActions.fillInSecondTextArea(notes.checkIn, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearPermanentLocation('item', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.findValue('Check out note', 3);
        BulkEditActions.selectAction('Add note', 3);
        BulkEditActions.fillInSecondTextArea(notes.checkOut, 3);
        BulkEditActions.checkStaffOnlyCheckbox(3);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Action note', 4);
        BulkEditActions.selectSecondAction('Add note', 4);
        BulkEditActions.verifyStaffOnlyCheckbox(false, 4);
        BulkEditActions.fillInSecondTextArea(notes.action, 4);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.findValue('Binding', 5);
        const possibleActions = ['Remove', 'Replace with'];
        BulkEditActions.verifyPossibleActions(possibleActions, 5);
        BulkEditActions.verifyCheckboxAbsentByRow(5);
        BulkEditActions.selectAction('Add note', 5);
        BulkEditActions.fillInSecondTextArea(notes.binding, 5);
        BulkEditActions.checkStaffOnlyCheckbox(5);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Copy note', notes.copy, 6);
        BulkEditActions.checkStaffOnlyCheckbox(6);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Electronic bookplate', 7);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Note', notes.note, 8);
        BulkEditActions.checkStaffOnlyCheckbox(8);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Provenance', notes.provenance, 9);
        BulkEditActions.checkStaffOnlyCheckbox(9);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Reproduction', notes.reproduction, 10);
        BulkEditActions.checkStaffOnlyCheckbox(10);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        const suppressFromDiscovery = true;
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 11);
        BulkEditActions.deleteRow(2);
        BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
        BulkEditActions.verifyStaffOnlyCheckbox(false, 3);

        BulkEditActions.verifyStaffOnlyCheckbox(true, 2);
        BulkEditActions.verifyStaffOnlyCheckbox(true, 4);
        BulkEditActions.verifyStaffOnlyCheckbox(true, 5);
        BulkEditActions.verifyStaffOnlyCheckbox(true, 7);
        BulkEditActions.verifyStaffOnlyCheckbox(true, 8);
        BulkEditActions.verifyStaffOnlyCheckbox(true, 9);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.hrid);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Check out notes',
          `${notes.checkOut} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in notes', notes.checkIn);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Binding note',
          `${notes.binding} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Copy note',
          `${notes.copy} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Provenance note',
          `${notes.provenance} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Reproduction note',
          `${notes.reproduction} (staff only)`,
        );
        // TODO: uncomment after UIBULKED-425
        // BulkEditSearchPane.verifyExactChangesUnderColumns('Suppress from discovery', suppressFromDiscovery);

        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.uncheckStaffOnlyCheckbox(8);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.hrid);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Check out notes',
          `${notes.checkOut} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in notes', notes.checkIn);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Binding note',
          `${notes.binding} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Copy note',
          `${notes.copy} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Provenance note', notes.provenance);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Reproduction note',
          `${notes.reproduction} (staff only)`,
        );
        BulkEditActions.downloadPreview();
        let contentToVerify = `,${notes.admin},Action note;${notes.action};false|Binding;${notes.binding};true|Copy note;${notes.copy};true|Note;${notes.note};true|Provenance;${notes.provenance};false|Reproduction;${notes.reproduction};true,${notes.checkIn},${notes.checkOut} (staff only),Available,`;
        ExportFile.verifyFileIncludes(previewFileName, [contentToVerify]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        contentToVerify = `,${notes.admin},Action note;${notes.action};false|Binding;${notes.binding};true|Copy note;${notes.copy};true|Note;${notes.note};true|Provenance;${notes.provenance};false|Reproduction;${notes.reproduction};true,${notes.checkIn},${notes.checkOut} (staff only),Available,`;
        ExportFile.verifyFileIncludes(changedRecordsFileName, [contentToVerify]);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', notes.admin);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Check out notes',
          `${notes.checkOut} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Check in notes', notes.checkIn);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', notes.action);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Binding note',
          `${notes.binding} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Copy note',
          `${notes.copy} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Electronic bookplate note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', `${notes.note} (staff only)`);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Provenance note', notes.provenance);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Reproduction note',
          `${notes.reproduction} (staff only)`,
        );

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
        ItemRecordView.checkItemAdministrativeNote(notes.admin);
        ItemRecordView.checkCheckInNote(notes.checkIn, 'No');
        ItemRecordView.checkCheckOutNote(notes.checkOut, 'Yes');
        const notesToCheck = [
          { rowIndex: 0, staffOnly: 'No', noteType: 'Action note', noteText: notes.action },
          { rowIndex: 1, staffOnly: 'Yes', noteType: 'Binding', noteText: notes.binding },
          { rowIndex: 2, staffOnly: 'Yes', noteType: 'Copy note', noteText: notes.copy },
          { rowIndex: 3, staffOnly: 'Yes', noteType: 'Note', noteText: notes.note },
          { rowIndex: 4, staffOnly: 'No', noteType: 'Provenance', noteText: notes.provenance },
          { rowIndex: 5, staffOnly: 'Yes', noteType: 'Reproduction', noteText: notes.reproduction },
        ];

        notesToCheck.forEach((note) => {
          ItemRecordView.checkMultipleItemNotesWithStaffOnly(
            note.rowIndex,
            note.staffOnly,
            note.noteType,
            note.noteText,
          );
        });
      },
    );
  });
});
