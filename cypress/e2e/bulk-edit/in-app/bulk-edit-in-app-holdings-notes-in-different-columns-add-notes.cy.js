import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
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
let actionNoteTypeId;
let newNoteTypeId;
const newNoteType = `C422220 New note type ${getRandomPostfix()}`;
const notesText = {
  actionNote: 'Action note text',
  actionNoteNew: 'One more Action note text',
  newNoteText: `Holding note
with line break`,
};
const instance = {
  instanceName: `C422220 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  add: 'Add note',
};
const initialValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE, notesText.actionNote],
  [newNoteType, ''],
];
const editedValueSets = [
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
    `${notesText.actionNote} | ${notesText.actionNoteNew}`,
  ],
  [newNoteType, notesText.newNoteText],
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);

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
      cy.getAdminToken();
      InventoryInstances.createHoldingsNoteTypeViaApi(newNoteType).then((noteId) => {
        newNoteTypeId = noteId;
      });
      cy.wait(5000);

      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryAll.gui]).then(
        (userProperties) => {
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

            cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.ACTION_NOTE)
              .then((holdingNoteTypeId) => {
                actionNoteTypeId = holdingNoteTypeId;
              })
              .then(() => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  notes: [
                    {
                      holdingsNoteTypeId: actionNoteTypeId,
                      note: notesText.actionNote,
                      staffOnly: false,
                    },
                  ],
                });
                cy.wait(5000);
              });

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteHoldingsNoteTypeViaApi(newNoteTypeId);
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
      'C422220 Verify separating notes in different columns - add notes (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422220'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          newNoteType,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        initialValueSets.forEach((initialValueSet) => {
          BulkEditSearchPane.verifyResultsUnderColumns(...initialValueSet);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        verifyFileContent(matchedRecordsFileName, initialValueSets);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ACTION_NOTE);
        cy.wait(1000);
        BulkEditActions.selectSecondAction(actionsToSelect.add);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.add);
        BulkEditActions.fillInSecondTextArea(notesText.actionNoteNew);
        BulkEditActions.verifyValueInSecondTextArea(notesText.actionNoteNew);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(newNoteType, 1);
        BulkEditActions.selectSecondAction(actionsToSelect.add, 1);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.add, 1);
        BulkEditActions.fillInSecondTextArea(notesText.newNoteText, 1);
        BulkEditActions.verifyValueInSecondTextArea(notesText.newNoteText, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureFormByRowExactMatch(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditActions.verifyChangesInAreYouSureFormByRowExactMatch(editedValueSet[0], [
            editedValueSet[1],
          ]);
        });

        BulkEditActions.downloadPreview();

        editedValueSets.forEach((editedValueSet) => {
          ExportFile.verifyFileIncludes(previewFileName, editedValueSet);
        });

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner();
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditSearchPane.verifyExactChangesUnderColumns(...editedValueSet);
        });

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          newNoteType,
        );
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
        );
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(newNoteType);
        BulkEditActions.downloadChangedCSV();

        editedValueSets.forEach((editedValueSet) => {
          ExportFile.verifyFileIncludes(changedRecordsFileName, editedValueSet);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkNotesByType(
          0,
          HOLDING_NOTE_TYPES.ACTION_NOTE,
          notesText.actionNote,
        );
        HoldingsRecordView.checkNotesByType(
          0,
          HOLDING_NOTE_TYPES.ACTION_NOTE,
          notesText.actionNoteNew,
          'No',
          1,
        );
        HoldingsRecordView.checkNotesByType(1, newNoteType, notesText.newNoteText);
      },
    );
  });
});
