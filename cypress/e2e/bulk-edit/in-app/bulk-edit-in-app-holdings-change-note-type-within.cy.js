import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { HOLDING_NOTES } from '../../../support/constants';
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
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);

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
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C895641 Verify Bulk Edit actions for Holdings notes - preserve the "Staff only" flag when change note type within the group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C895641'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note', 'Note');
        BulkEditActions.openStartBulkEditForm();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.holdingsUUID]);
        BulkEditActions.changeNoteType('Action note', 'Note');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Note', [
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        ]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only),`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Note',
          `${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${notes.actionNote} | ${notes.actionNoteStaffOnly} (staff only),`,
        ]);

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
