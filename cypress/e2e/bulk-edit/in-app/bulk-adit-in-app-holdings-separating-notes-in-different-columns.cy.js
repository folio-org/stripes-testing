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
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let copyNoteTypeId;
let electronicBookplateNoteTypeId;
const notesText = {
  copyNote: 'Copy note text',
  electronicBookplate: 'Electronic bookplate note text',
};
const instance = {
  instanceName: `C422198 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  find: 'Find',
  remove: 'Remove',
  removeAll: 'Remove all',
};
const initialValueSets = [
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
    `${notesText.copyNote} (staff only) | ${notesText.copyNote}`,
  ],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
    `${notesText.electronicBookplate} (staff only) | ${notesText.electronicBookplate}`,
  ],
];
const editedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE, ''],
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

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

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          instance.instanceId = InventoryInstances.createInstanceViaApi(
            instance.instanceName,
            instance.itemBarcode,
          );
          cy.getAdminToken();
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

            cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.COPY_NOTE)
              .then((holdingNoteTypeId) => {
                copyNoteTypeId = holdingNoteTypeId;
              })
              .then(() => {
                cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE).then(
                  (holdingNoteTypeId) => {
                    electronicBookplateNoteTypeId = holdingNoteTypeId;
                  },
                );
              })
              .then(() => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  notes: [
                    {
                      holdingsNoteTypeId: copyNoteTypeId,
                      note: notesText.copyNote,
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: copyNoteTypeId,
                      note: notesText.copyNote,
                      staffOnly: false,
                    },
                    {
                      holdingsNoteTypeId: electronicBookplateNoteTypeId,
                      note: notesText.electronicBookplate,
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: electronicBookplateNoteTypeId,
                      note: notesText.electronicBookplate,
                      staffOnly: false,
                    },
                  ],
                });
              });
            cy.wait(3000);
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C422198 Verify separating notes in different columns - remove notes (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422198'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
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
        verifyFileContent(fileNames.matchedRecordsCSV, initialValueSets);
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.COPY_NOTE);
        cy.wait(1000);
        BulkEditActions.selectAction(actionsToSelect.find);
        BulkEditActions.fillInFirstTextArea(notesText.copyNote);
        BulkEditActions.selectSecondAction(actionsToSelect.remove);
        BulkEditActions.verifyActionSelected(actionsToSelect.find);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.remove);
        BulkEditActions.verifyValueInFirstTextArea(notesText.copyNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE, 1);
        BulkEditActions.selectAction(actionsToSelect.removeAll, 1);
        BulkEditActions.verifyActionSelected(actionsToSelect.removeAll, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );

        editedValueSets.forEach((editedValueSet) => {
          BulkEditActions.verifyChangesInAreYouSureForm(editedValueSet[0], [editedValueSet[1]]);
        });

        BulkEditActions.downloadPreview();
        verifyFileContent(fileNames.previewRecordsCSV, editedValueSets);
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
        BulkEditActions.downloadChangedCSV();
        verifyFileContent(fileNames.changedRecordsCSV, editedValueSets);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.verifyTextAbsent(HOLDING_NOTE_TYPES.COPY_NOTE);
        HoldingsRecordView.verifyTextAbsent(notesText.copyNote);
        HoldingsRecordView.verifyTextAbsent(HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE);
        HoldingsRecordView.verifyTextAbsent(notesText.electronicBookplate);
      },
    );
  });
});
