import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
} from '../../../support/constants';

let user;
const createdNoteTypeIds = [];
const instance = {
  instanceName: `AT_C440089_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  changeNoteType: 'Change note type',
};
let generatedNotes;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);
const numberOfNotes = 12;
const createdNoteTypes = [];

for (let i = 1; i <= numberOfNotes; i++) {
  createdNoteTypes.push(`AT_C440089_NoteType_${i}_${randomFourDigitNumber()}`);
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      createdNoteTypes.forEach((noteType) => {
        InventoryInstances.createHoldingsNoteTypeViaApi(noteType).then((noteId) => {
          createdNoteTypeIds.push(noteId);
        });
      });
      cy.wait(3000);

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

          FileManager.createFile(
            `cypress/fixtures/${holdingUUIDsFileName}`,
            `${instance.holdingsUUID}`,
          );

          generatedNotes = createdNoteTypeIds.map((id) => ({
            holdingsNoteTypeId: id,
            note: `Note text ${getRandomPostfix()}`,
            staffOnly: false,
          }));

          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            notes: generatedNotes,
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      createdNoteTypeIds.forEach((noteTypeId) => {
        InventoryInstances.deleteHoldingsNoteTypeViaApi(noteTypeId);
      });

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
      'C440089 Verify more than 10 note types are displayed - holdings (firebird)',
      { tags: ['criticalPath', 'firebird', 'C440089'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifySelectOptionsHoldingSortedAlphabetically();
        BulkEditActions.clickOptionsSelection();
        BulkEditActions.selectOption(createdNoteTypes[0]);
        BulkEditActions.verifyOptionSelected(createdNoteTypes[0]);
        cy.wait(1000);
        BulkEditActions.selectSecondAction(actionsToSelect.changeNoteType);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.changeNoteType);

        const defaultNoteTypes = Object.values(HOLDING_NOTE_TYPES);
        const createdNoteTypesWithoutSelected = createdNoteTypes.slice(1);

        defaultNoteTypes.forEach((defaultNoteType) => {
          BulkEditActions.verifyNoteTypeInNoteHoldingTypeDropdown(defaultNoteType);
        });
        createdNoteTypesWithoutSelected.forEach((createdNoteType) => {
          BulkEditActions.verifyNoteTypeInNoteHoldingTypeDropdown(createdNoteType);
        });

        BulkEditActions.selectNoteTypeWhenChangingIt(HOLDING_NOTE_TYPES.ACTION_NOTE);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureFormByRowExactMatch(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );
        BulkEditActions.verifyChangesInAreYouSureFormByRowExactMatch(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          [generatedNotes[0].note],
        );
        BulkEditActions.verifyChangesInAreYouSureFormByRowExactMatch(createdNoteTypes[0], ['']);
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          generatedNotes[0].note,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          createdNoteTypes[0],
          '',
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          generatedNotes[0].note,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.holdingHRID,
          createdNoteTypes[0],
          '',
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          generatedNotes[0].note,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          createdNoteTypes[0],
          '',
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkNotesByType(
          11,
          HOLDING_NOTE_TYPES.ACTION_NOTE,
          generatedNotes[0].note,
        );
      },
    );
  });
});
