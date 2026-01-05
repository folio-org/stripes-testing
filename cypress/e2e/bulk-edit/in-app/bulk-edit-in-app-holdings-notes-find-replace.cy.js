import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
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
  HOLDING_NOTES,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const notes = {
  adminOne: 'admin test no;te',
  adminOneReplaced: 'admin test note',
  adminTwo: 'Admin test no;te',
  adminTwoReplaced: 'Admin test note',
  actionOne: 'action test no;te',
  actionOneReplaced: 'action test ~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;',
  actionTwo: 'Action test no;te',
  actionTwoReplaced: 'Action test ~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const holdingsHRIDFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const previewFileName = BulkEditFiles.getPreviewFileName(holdingsHRIDFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingsHRIDFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryCRUDHoldings.gui]).then(
        (userProperties) => {
          user = userProperties;
          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.barcode,
          );
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${item.instanceId}"`,
          }).then((holdings) => {
            item.holdingHRID = holdings[0].hrid;
            FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, item.holdingHRID);
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              administrativeNotes: [notes.adminOne, notes.adminTwo],
              notes: [
                {
                  holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                  note: notes.actionOne,
                  staffOnly: false,
                },
                {
                  holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                  note: notes.actionTwo,
                  staffOnly: false,
                },
              ],
            });
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
      FileManager.deleteFileFromDownloadsByMask(previewFileName, changedRecordsFileName);
    });

    it(
      'C422054 Verify Bulk Edit actions for Holdings notes - Find-Replace (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422054'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          item.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          `${notes.adminOne}|${notes.adminTwo}`,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.noteReplaceWith(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          'no;te',
          'note',
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          'no;te',
          '~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;',
          1,
        );
        BulkEditActions.confirmChanges();

        const editedHeaderValue = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            value: `${notes.adminOneReplaced}|${notes.adminTwoReplaced}`,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
            value: `${notes.actionOneReplaced} | ${notes.actionTwoReplaced}`,
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          item.holdingHRID,
          editedHeaderValue,
        );
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          item.holdingHRID,
          editedHeaderValue,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          item.holdingHRID,
          editedHeaderValue,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          item.holdingHRID,
          editedHeaderValue,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote(notes.adminOneReplaced);
        HoldingsRecordView.checkAdministrativeNote(notes.adminTwoReplaced);
        HoldingsRecordView.checkHoldingsNoteByRow([notes.actionOneReplaced, 'No'], 0);
        HoldingsRecordView.checkHoldingsNoteByRow([notes.actionTwoReplaced, 'No'], 1);
      },
    );
  });
});
