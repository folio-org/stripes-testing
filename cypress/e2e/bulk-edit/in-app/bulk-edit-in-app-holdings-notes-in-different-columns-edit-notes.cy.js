import getRandomPostfix from '../../../support/utils/stringTools';
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
const holdingNoteTypeIds = [];
const notesText = {
  binding: 'Binding note text',
  note: 'Note text',
  copyNote: 'Copy note text',
  electronicBookplate: 'Electronic bookplate note ~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;',
  newNote: 'Holding note with special characters',
};
const instance = {
  instanceName: `C422221 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  find: 'Find',
  removeMarkAsStaffOnly: 'Remove mark as staff only',
  markAsStaffOnly: 'Mark as staff only',
  changeNoteType: 'Change note type',
  replaceWith: 'Replace with',
};
const initialValueSets = [
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
    `${notesText.binding} (staff only)`,
  ],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, `${notesText.note} (staff only)`],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, notesText.copyNote],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
    notesText.electronicBookplate,
  ],
];
const editedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE, notesText.binding],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE, ''],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE,
    `${notesText.note} (staff only)`,
  ],
  [
    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
    `${notesText.copyNote} (staff only)`,
  ],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE, notesText.newNote],
];
const holdingNoteTypeNamesSet = [
  HOLDING_NOTE_TYPES.NOTE,
  HOLDING_NOTE_TYPES.BINDING,
  HOLDING_NOTE_TYPES.COPY_NOTE,
  HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
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

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
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
            )
              .then(() => {
                holdingNoteTypeNamesSet.forEach((holdingNoteTypeName) => {
                  cy.getHoldingNoteTypeIdViaAPI(holdingNoteTypeName).then((holdingNoteTypeId) => {
                    holdingNoteTypeIds.push(holdingNoteTypeId);
                  });
                });
              })
              .then(() => {
                const [
                  noteTypeId,
                  bindingNoteTypeId,
                  copyNoteTypeId,
                  electronicBookplateNoteTypeId,
                ] = holdingNoteTypeIds;

                cy.updateHoldingRecord(instance.holdingsUUID, {
                  ...holdings[0],
                  notes: [
                    {
                      holdingsNoteTypeId: bindingNoteTypeId,
                      note: notesText.binding,
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: noteTypeId,
                      note: notesText.note,
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
                      staffOnly: false,
                    },
                  ],
                });
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
      'C422221 Verify separating notes in different columns - edit notes (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422221'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE,
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
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.BINDING);
        BulkEditActions.selectSecondAction(actionsToSelect.removeMarkAsStaffOnly);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.removeMarkAsStaffOnly);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.NOTE, 1);
        BulkEditActions.selectSecondAction(actionsToSelect.changeNoteType, 1);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.changeNoteType, 1);
        BulkEditActions.selectNoteTypeWhenChangingIt(HOLDING_NOTE_TYPES.PROVENANCE, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.COPY_NOTE, 2);
        BulkEditActions.selectSecondAction(actionsToSelect.markAsStaffOnly, 2);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.markAsStaffOnly, 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(3);
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE, 3);
        BulkEditActions.selectSecondAction(actionsToSelect.find, 3);
        BulkEditActions.verifyActionSelected(actionsToSelect.find, 3);
        BulkEditActions.fillInFirstTextArea(notesText.electronicBookplate, 3);
        BulkEditActions.verifyValueInFirstTextArea(notesText.electronicBookplate, 3);
        BulkEditActions.selectSecondAction(actionsToSelect.replaceWith, 3);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.replaceWith, 3);
        BulkEditActions.fillInSecondTextArea(notesText.newNote, 3);
        BulkEditActions.verifyValueInSecondTextArea(notesText.newNote, 3);
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
        verifyFileContent(previewFileName, editedValueSets);
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
        verifyFileContent(changedRecordsFileName, editedValueSets);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkNotesByType(0, HOLDING_NOTE_TYPES.BINDING, notesText.binding);
        HoldingsRecordView.checkNotesByType(
          1,
          HOLDING_NOTE_TYPES.COPY_NOTE,
          notesText.copyNote,
          'Yes',
        );
        HoldingsRecordView.checkNotesByType(
          2,
          HOLDING_NOTE_TYPES.ELECTRONIC_BOOKPLATE,
          notesText.newNote,
        );
        HoldingsRecordView.checkNotesByType(
          3,
          HOLDING_NOTE_TYPES.PROVENANCE,
          notesText.note,
          'Yes',
        );
        HoldingsRecordView.checkHoldingNoteTypeAbsent(HOLDING_NOTE_TYPES.NOTE, notesText.note);
      },
    );
  });
});
