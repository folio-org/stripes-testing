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
let copyNoteTypeId;
let reproductionNoteTypeId;
const notes = {
  administrative: 'Te;st: [sample] no*te',
  reproduction: 'Te;st: [sample] no*te',
  copyNote: 'Te;st: [sample] no*te',
};
const noteTypes = {
  administrative: 'Administrative note',
  reproduction: 'Reproduction',
  copyNote: 'Copy note',
};
const instance = {
  instanceName: `C422058 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  find: 'Find (full field search)',
  remove: 'Remove',
};
const administrativeNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Remove all',
];
const secondActionOptions = ['Remove', 'Replace with'];
const reproductionNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceHRIDFileName}`;
const previewFileName = `*-Updates-Preview-${instanceHRIDFileName}`;
const changedRecordsFileName = `*-Changed-Records-${instanceHRIDFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();

      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryCRUDHoldings.gui]).then(
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

            cy.getHoldingNoteTypeIdViaAPI('Copy note')
              .then((holdingNoteTypeId) => {
                copyNoteTypeId = holdingNoteTypeId;
              })
              .then(() => {
                cy.getHoldingNoteTypeIdViaAPI('Reproduction').then((holdingNoteTypeId) => {
                  reproductionNoteTypeId = holdingNoteTypeId;
                });
              })
              .then(() => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  administrativeNotes: [notes.administrative],
                  notes: [
                    {
                      holdingsNoteTypeId: copyNoteTypeId,
                      note: notes.copyNote,
                      staffOnly: false,
                    },
                    {
                      holdingsNoteTypeId: reproductionNoteTypeId,
                      note: notes.reproduction,
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
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C422058 Verify Bulk Edit actions for Holdings notes - Find-Remove (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        // 1
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);

        // 4
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          notes.administrative,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          notes.copyNote,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          notes.reproduction,
        );

        // 5
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        // BulkEditFiles.verifyValueInRowByUUID(
        //   matchedRecordsFileName,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
        //   instance.holdingsUUID,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        //   notes.administrative,
        // );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          notes.copyNote,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          notes.reproduction,
        );
        // 6
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditSearchPane.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // 7
        BulkEditActions.selectOption(noteTypes.administrative, 0);
        cy.wait(1000);
        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
        BulkEditActions.selectSecondAction(actionsToSelect.find);
        BulkEditActions.verifyActionSelected(actionsToSelect.find);
        BulkEditActions.verifyTheSecondActionOptions(secondActionOptions);
        BulkEditSearchPane.isConfirmButtonDisabled(true);

        // 10
        BulkEditActions.fillInFirstTextArea(notes.administrative);
        BulkEditActions.verifyValueInFirstTextArea(notes.administrative);
        BulkEditSearchPane.isConfirmButtonDisabled(true);

        // 11
        BulkEditActions.selectSecondAction(actionsToSelect.remove);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.remove);
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        // 12
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);

        // 13
        BulkEditActions.selectOption(noteTypes.reproduction, 1);

        // 14
        BulkEditActions.verifyTheActionOptions(reproductionNoteActionOptions, 1);

        // 15
        BulkEditActions.selectSecondAction(actionsToSelect.find, 1);
        BulkEditActions.verifyActionSelected(actionsToSelect.find, 1);
        BulkEditActions.verifyTheSecondActionOptions(secondActionOptions, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(true);

        // 16
        BulkEditActions.selectSecondAction(actionsToSelect.remove, 1);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.remove, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(true);

        // 17
        BulkEditActions.fillInFirstTextArea(notes.reproduction, 1);
        BulkEditActions.verifyValueInFirstTextArea(notes.reproduction, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        // 18
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);

        // 19
        BulkEditActions.selectOption(noteTypes.copyNote, 2);
        BulkEditActions.selectSecondAction(actionsToSelect.find, 2);
        BulkEditActions.verifyActionSelected(actionsToSelect.find, 2);
        BulkEditActions.fillInFirstTextArea('Test: sample note', 2);
        BulkEditActions.verifyValueInFirstTextArea('Test: sample note', 2);
        BulkEditActions.selectSecondAction(actionsToSelect.remove, 2);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.remove, 2);
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        // 20
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          [''],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          [''],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          [notes.copyNote],
        );

        // 21
        BulkEditActions.downloadPreview();
        // BulkEditFiles.verifyValueInRowByUUID(
        //   previewFileName,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
        //   instance.holdingsUUID,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        //   '',
        // );

        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          notes.copyNote,
        );

        // 22
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          '',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          '',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          notes.copyNote,
        );

        // 23
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        // BulkEditFiles.verifyValueInRowByUUID(
        //   changedRecordsFileName,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
        //   instance.holdingsUUID,
        //   BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        //   '',
        // );

        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          notes.copyNote,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote('-');
        HoldingsRecordView.checkNotesByType(0, noteTypes.copyNote, notes.copyNote);
        HoldingsRecordView.checkHoldingNoteTypeAbsent(noteTypes.reproduction, notes.reproduction);
      },
    );
  });
});
