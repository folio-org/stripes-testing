import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const instance = {
  instanceName: `C422041 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  holdingsUUID: null,
};
const notes = {
  administrative: 'C422041 test administrative note',
  note: 'C422041 test note',
  binding: "C422041 test binding note:~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,;",
};
const noteTypes = {
  action: 'Action note',
  administrative: 'Administrative note',
  binding: 'Binding',
  electronicBookplate: 'Electronic bookplate',
  note: 'Note',
};
const actionsToSelect = {
  addNote: 'Add note',
  removeMarkAsStaffOnly: 'Remove mark as staff only',
  markAsStaffOnly: 'Mark as staff only',
};
const administrativeNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Remove all',
];
const noteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const initialValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE, ''],
];
const modifiedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, notes.administrative],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, notes.note],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE, notes.binding],
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;

function verifyFileContent(fileName, headerValuePairs) {
  headerValuePairs.forEach((pair) => {
    BulkEditFiles.verifyValueInRowByUUID(
      fileName,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
      instance.holdingsUUID,
      ...pair,
    );
  });
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

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

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
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C422041 Verify Bulk Edit actions for Holdings notes - add notes (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        initialValueSets.forEach((initialHeaderValueSet) => {
          BulkEditSearchPane.verifyResultsUnderColumns(...initialHeaderValueSet);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        verifyFileContent(matchedRecordsFileName, initialValueSets);

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditSearchPane.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyHoldingsOptions();
        BulkEditActions.selectOption(noteTypes.administrative, 0);
        cy.wait(500);
        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote);
        cy.wait(500);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.addNote);
        BulkEditActions.fillInSecondTextArea(notes.administrative);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(noteTypes.note, 1);
        cy.wait(500);
        BulkEditActions.verifyTheActionOptions(noteActionOptions, 1);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote, 1);
        BulkEditActions.fillInSecondTextArea(notes.note, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);
        BulkEditActions.selectOption(noteTypes.binding, 2);
        BulkEditActions.verifyTheActionOptions(noteActionOptions, 2);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote, 2);
        BulkEditActions.fillInSecondTextArea(notes.binding, 2);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );

        modifiedValueSets.forEach((modifiedValueSet) => {
          BulkEditActions.verifyChangesInAreYouSureForm(modifiedValueSet[0], [modifiedValueSet[1]]);
        });

        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);
        BulkEditActions.verifyCloseAreYouSureModalButtonDisabled(false);
        BulkEditActions.downloadPreview();
        verifyFileContent(previewFileName, modifiedValueSets);

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        modifiedValueSets.forEach((modifiedValueSet) => {
          BulkEditSearchPane.verifyExactChangesUnderColumns(...modifiedValueSet);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        verifyFileContent(changedRecordsFileName, modifiedValueSets);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote(notes.administrative);
        HoldingsRecordView.checkNotesByType(0, noteTypes.binding, notes.binding);
        HoldingsRecordView.checkNotesByType(1, noteTypes.note, notes.note);
      },
    );
  });
});
