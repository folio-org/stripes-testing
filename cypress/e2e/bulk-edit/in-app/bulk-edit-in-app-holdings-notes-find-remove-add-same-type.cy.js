import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import {
  APPLICATION_NAMES,
  HOLDING_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';

let user;
const notes = {
  action: 'Test [sample] no*te action',
  elbook: 'elbook Test [sample] no*te',
  note: 'test note',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `AT_C422070_FolioInstance${getRandomPostfix()}`,
};
const holdingHRIDsFileName = `holdingHRIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingHRIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingHRIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingHRIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryCRUDHoldings.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.barcode,
          );
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${item.instanceId}"`,
          }).then((holdings) => {
            item.holdingHRID = holdings[0].hrid;
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              administrativeNotes: [notes.admin],
              notes: [
                {
                  holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                  note: notes.action,
                  staffOnly: false,
                },
                {
                  holdingsNoteTypeId: HOLDING_NOTES.ELECTRONIC_BOOKPLATE_NOTE,
                  note: notes.elbook,
                  staffOnly: false,
                },
              ],
            });
            FileManager.createFile(`cypress/fixtures/${holdingHRIDsFileName}`, holdings[0].hrid);
          });
        },
      );
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C422070 Verify Bulk Edit actions for Holdings notes - Find-Remove and Add the same type (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C422070'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);

        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          item.holdingHRID,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
              value: notes.action,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
              value: notes.elbook,
            },
          ],
        );
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Electronic bookplate note',
          'Note',
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.noteRemove('Action note', notes.action);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Note', notes.note, 1);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Action note', ['']);
        BulkEditActions.verifyChangesInAreYouSureForm('Note', [notes.note]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`,${notes.elbook},${notes.note},`]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', notes.note);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [`,${notes.elbook},${notes.note},`]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkHoldingsNote(notes.elbook, 0);
        HoldingsRecordView.checkHoldingsNote(notes.note, 1);
        HoldingsRecordView.verifyTextAbsent('Action note');
        HoldingsRecordView.verifyTextAbsent(notes.action);
      },
    );
  });
});
