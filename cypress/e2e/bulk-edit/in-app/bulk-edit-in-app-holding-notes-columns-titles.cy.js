import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const notes = {
  administrative: 'C430210 Administrative\n note text',
  electronicBookplate: 'C430210 Electronic bookplate note text',
  provenance: 'C430210 Provenance note text',
  reproduction: 'C430210 Reproduction note text',
  binding: "C430210 test binding note:~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,;",
};
const instance = {
  instanceName: `C430210 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  addNote: 'Add note',
};
const administrativeNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Remove all',
];
const nonAdministrativeNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const initialValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION, ''],
];
const notesToAdd = [
  [1, HOLDING_NOTE_TYPES.BINDING, notes.binding],
  [2, HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE, notes.electronicBookplate],
  [3, HOLDING_NOTE_TYPES.PROVENANCE, notes.provenance],
  [4, HOLDING_NOTE_TYPES.REPRODUCTION, notes.reproduction],
];
const editedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, notes.administrative],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE, notes.binding],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, ''],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
    notes.electronicBookplate,
  ],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE, notes.provenance],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION, notes.reproduction],
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;

function addNoteInBulkEdit(rowNumber, holdingNoteType, noteText) {
  BulkEditActions.addNewBulkEditFilterString();
  BulkEditActions.verifyNewBulkEditRow(rowNumber);
  BulkEditActions.selectOption(holdingNoteType, rowNumber);
  BulkEditActions.verifyTheActionOptions(nonAdministrativeNoteActionOptions, rowNumber);
  BulkEditActions.selectSecondAction(actionsToSelect.addNote, rowNumber);
  BulkEditActions.verifySecondActionSelected(actionsToSelect.addNote, rowNumber);
  BulkEditActions.fillInSecondTextArea(noteText, rowNumber);
  BulkEditActions.verifyValueInSecondTextArea(noteText, rowNumber);
  BulkEditSearchPane.isConfirmButtonDisabled(false);
}

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();

      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        instance.instanceId = InventoryInstances.createInstanceViaApi(
          instance.instanceName,
          instance.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instance.instanceId}"`,
        }).then((holdings) => {
          instance.holdingHRID = holdings[0].hrid;
          instance.holdingsUUID = holdings[0].id;

          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, changedRecordsFileName);
    });

    it(
      'C430210 Verify Bulk Edit actions for Holdings notes - columns titles (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.searchColumnName('note');

        initialValueSets.forEach((initialValueSet) => {
          BulkEditSearchPane.changeShowColumnCheckbox(initialValueSet[0]);
        });

        initialValueSets.forEach((initialValueSet) => {
          BulkEditSearchPane.verifyResultsUnderColumns(...initialValueSet);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [instance.holdingsUUID]);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditSearchPane.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyHoldingsOptions();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE, 0);
        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.addNote);
        BulkEditActions.fillInSecondTextArea(notes.administrative);
        BulkEditActions.verifyValueInSecondTextArea(notes.administrative);
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        notesToAdd.forEach((noteToAdd) => {
          addNoteInBulkEdit(...noteToAdd);
        });

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditActions.verifyChangesInAreYouSureForm(editedValueSet[0], [editedValueSet[1]]);
        });

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditSearchPane.verifyExactChangesUnderColumns(...editedValueSet);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [instance.holdingsUUID]);

        editedValueSets.forEach((editedValueSet) => {
          ExportFile.verifyFileIncludes(changedRecordsFileName, editedValueSet);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkExactContentInAdministrativeNote(notes.administrative);
        HoldingsRecordView.checkNotesByType(0, HOLDING_NOTE_TYPES.BINDING, notes.binding);
        HoldingsRecordView.checkNotesByType(
          1,
          HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
          notes.electronicBookplate,
        );
        HoldingsRecordView.checkNotesByType(2, HOLDING_NOTE_TYPES.PROVENANCE, notes.provenance);
        HoldingsRecordView.checkNotesByType(3, HOLDING_NOTE_TYPES.REPRODUCTION, notes.reproduction);
      },
    );
  });
});