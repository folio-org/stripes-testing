import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  HOLDING_NOTES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const notes = {
  actionNote: 'Holding note',
  actionNoteStaffOnly: 'Holding note Staff only',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
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
        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          item.holdingHRID = holdings[0].hrid;
          item.holdingsUUID = holdings[0].id;
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            notes: [
              {
                holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                note: notes.actionNote,
                staffOnly: false,
              },
              {
                holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                note: notes.actionNoteStaffOnly,
                staffOnly: true,
              },
            ],
          });
        });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C422004 Verify Bulk Edit actions for Holdings notes - preserve the "Staff only" flag when change note type within the group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422004'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note', 'Note');
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          item.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.verifyGroupOptionsInSelectOptionsDropdown('holding');
        BulkEditActions.selectOption('Action note');
        BulkEditActions.verifyOptionSelected('Action note');
        BulkEditActions.verifyTheActionOptionsEqual(
          [
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
            BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
          ],
          false,
        );
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE);
        BulkEditActions.fillInFirstTextArea('action note');
        BulkEditActions.checkStaffOnlyCheckbox();
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);
        BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.ADD_NOTE);
        BulkEditActions.verifyValueInFirstTextArea('');
        BulkEditActions.verifyStaffOnlyCheckbox(false);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.changeNoteType('Action note', 'Note');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Note', [
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        ]);
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          item.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE,
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Note',
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          item.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE,
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        );

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkHoldingsNoteByRow([notes.actionNote, 'No']);
        HoldingsRecordView.checkHoldingsNoteByRow([notes.actionNoteStaffOnly, 'Yes'], 1);
        ItemRecordView.verifyTextAbsent('Action note');
      },
    );
  });
});
