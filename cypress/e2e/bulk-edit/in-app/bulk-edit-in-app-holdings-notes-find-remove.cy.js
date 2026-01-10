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
let reproductionNoteTypeId;
let instance;
let instanceHRIDFileName;
let matchedRecordsFileName;
let previewFileName;
let changedRecordsFileName;
const noteText = 'Te;st: [sample] no*te';
const nonExistentNoteText = 'Test: sample note';
const actionsToSelect = {
  find: 'Find',
  remove: 'Remove',
};
const administrativeNoteActionOptions = ['Add note', 'Change note type', 'Find', 'Remove all'];
const secondActionOptions = ['Remove', 'Replace with'];
const reproductionNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const initialValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION, noteText],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, noteText],
];
const editedValueSets = [
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, ''],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION, null],
  [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, noteText],
];

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

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        instance = {
          instanceName: `C422058 instance-${getRandomPostfix()}`,
          itemBarcode: getRandomPostfix(),
        };
        instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDFileName);
        previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDFileName);
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceHRIDFileName);
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.inventoryCRUDHoldings.gui,
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

            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${instance.instanceId}"`,
            }).then((instanceData) => {
              instance.instanceHRID = instanceData.hrid;

              FileManager.createFile(
                `cypress/fixtures/${instanceHRIDFileName}`,
                `${instance.instanceHRID}`,
              );
            });

            cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.COPY_NOTE)
              .then((holdingNoteTypeId) => {
                copyNoteTypeId = holdingNoteTypeId;
              })
              .then(() => {
                cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.REPRODUCTION).then(
                  (holdingNoteTypeId) => {
                    reproductionNoteTypeId = holdingNoteTypeId;
                  },
                );
              })
              .then(() => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  administrativeNotes: [noteText],
                  notes: [
                    {
                      holdingsNoteTypeId: copyNoteTypeId,
                      note: noteText,
                      staffOnly: false,
                    },
                    {
                      holdingsNoteTypeId: reproductionNoteTypeId,
                      note: noteText,
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
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C700847 Verify Bulk Edit actions for Holdings notes - Find-Remove (firebird)',
        { tags: ['criticalPath', 'firebird', 'C700847'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);

          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          );
          BulkEditSearchPane.verifyResultsUnderColumns(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.holdingHRID,
          );
          BulkEditSearchPane.verifyResultsUnderColumns(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            noteText,
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

          BulkEditActions.selectOption(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE, 0);
          BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
          BulkEditActions.selectSecondAction(actionsToSelect.find);
          BulkEditActions.verifyActionSelected(actionsToSelect.find);
          BulkEditActions.verifyTheSecondActionOptions(secondActionOptions);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.fillInFirstTextArea(noteText);
          BulkEditActions.verifyValueInFirstTextArea(noteText);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.selectSecondAction(actionsToSelect.remove);
          BulkEditActions.verifySecondActionSelected(actionsToSelect.remove);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.selectOption(HOLDING_NOTE_TYPES.REPRODUCTION, 1);
          BulkEditActions.verifyTheActionOptions(reproductionNoteActionOptions, 1);
          BulkEditActions.selectSecondAction(actionsToSelect.find, 1);
          BulkEditActions.verifyActionSelected(actionsToSelect.find, 1);
          BulkEditActions.verifyTheSecondActionOptions(secondActionOptions, 1);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.selectSecondAction(actionsToSelect.remove, 1);
          BulkEditActions.verifySecondActionSelected(actionsToSelect.remove, 1);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.fillInFirstTextArea(noteText, 1);
          BulkEditActions.verifyValueInFirstTextArea(noteText, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.selectOption(HOLDING_NOTE_TYPES.COPY_NOTE, 2);
          BulkEditActions.selectSecondAction(actionsToSelect.find, 2);
          BulkEditActions.verifyActionSelected(actionsToSelect.find, 2);
          BulkEditActions.fillInFirstTextArea(nonExistentNoteText, 2);
          BulkEditActions.verifyValueInFirstTextArea(nonExistentNoteText, 2);
          BulkEditActions.selectSecondAction(actionsToSelect.remove, 2);
          BulkEditActions.verifySecondActionSelected(actionsToSelect.remove, 2);
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
          verifyFileContent(previewFileName, editedValueSets);
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumns(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            instance.holdingHRID,
          );

          [
            [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE, ''],
            [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION, 'null'],
            [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE, noteText],
          ].forEach((editedValueSet) => {
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
          HoldingsRecordView.checkAdministrativeNote('-');
          HoldingsRecordView.checkNotesByType(0, HOLDING_NOTE_TYPES.COPY_NOTE, noteText);
          HoldingsRecordView.checkNotesByType(1, HOLDING_NOTE_TYPES.REPRODUCTION, '-');
        },
      );
    });
  },
);
