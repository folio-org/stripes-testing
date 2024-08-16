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
  HOLDING_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
const notes = {
  electronicBookplate: 'C422033 test electronic bookplate note',
  additionalElectronicBookplate: 'Electronic note 2',
  action: 'C422033 test action note',
  binding: 'C422033 test binding note',
};
const noteTypes = {
  action: 'Action note',
  administrative: 'Administrative note',
  binding: 'Binding',
  electronicBookplate: 'Electronic bookplate',
};
const instance = {
  instanceName: `C422033 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
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
const actionNoteActionOptions = [
  'Add note',
  'Change note type',
  'Find (full field search)',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;

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

          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            notes: [
              {
                holdingsNoteTypeId: HOLDING_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                note: notes.electronicBookplate,
                staffOnly: true,
              },
              {
                holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                note: notes.action,
                staffOnly: true,
              },
              {
                holdingsNoteTypeId: HOLDING_NOTES.BINDING_NOTE,
                note: notes.binding,
                staffOnly: false,
              },
            ],
          });
        });
      });
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
      'C422033 Verify Bulk Edit actions for Holdings notes - add mark Staff only and remove mark staff only (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          `${notes.action} (staff only)`,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          `${notes.electronicBookplate} (staff only)`,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          notes.binding,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          `${notes.action} (staff only)`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          `${notes.electronicBookplate} (staff only)`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          notes.binding,
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditSearchPane.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyHoldingsOptions();
        BulkEditActions.selectOption(noteTypes.administrative, 0);
        cy.wait(1000);
        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
        BulkEditActions.selectOption(noteTypes.action, 0);
        cy.wait(1000);
        BulkEditActions.verifyTheActionOptions(actionNoteActionOptions);
        BulkEditActions.selectSecondAction(actionsToSelect.removeMarkAsStaffOnly);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.removeMarkAsStaffOnly);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(noteTypes.electronicBookplate, 1);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote, 1);
        BulkEditActions.fillInSecondTextArea(notes.additionalElectronicBookplate, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(2);
        BulkEditActions.selectOption(noteTypes.binding, 2);
        BulkEditActions.selectSecondAction(actionsToSelect.markAsStaffOnly, 2);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.markAsStaffOnly, 2);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          [notes.action],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          [`${notes.electronicBookplate} (staff only) | ${notes.additionalElectronicBookplate}`],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          [`${notes.binding} (staff only)`],
        );
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);
        BulkEditActions.verifyCloseAreYouSureModalButtonDisabled(false);
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          notes.action,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          `${notes.electronicBookplate} (staff only) | ${notes.additionalElectronicBookplate}`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          `${notes.binding} (staff only)`,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          notes.action,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          `${notes.electronicBookplate} (staff only) | ${notes.additionalElectronicBookplate}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          `${notes.binding} (staff only)`,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          notes.action,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          `${notes.electronicBookplate} (staff only) | ${notes.additionalElectronicBookplate}`,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
          `${notes.binding} (staff only)`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkNotesByType(0, noteTypes.action, notes.action);
        HoldingsRecordView.checkNotesByType(1, noteTypes.binding, notes.binding, 'Yes');
        HoldingsRecordView.checkNotesByType(
          2,
          noteTypes.electronicBookplate,
          notes.electronicBookplate,
          'Yes',
        );
        HoldingsRecordView.checkNotesByType(
          2,
          noteTypes.electronicBookplate,
          notes.additionalElectronicBookplate,
          'No',
          1,
        );
      },
    );
  });
});
