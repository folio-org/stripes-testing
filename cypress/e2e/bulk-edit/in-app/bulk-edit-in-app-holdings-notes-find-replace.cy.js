import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { HOLDING_NOTES } from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const notes = {
  adminOne: 'adminNote',
  adminTwo: 'AdminNote',
  actionOne: 'actionNote',
  actionTwo: 'ActionNote',
};
const newNotes = {
  adminNote: `adminNote-${getRandomPostfix()}`,
  actionNote: `actionNote-${getRandomPostfix()}`,
};

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const holdingsHRIDFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${holdingsHRIDFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
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
                  staffOnly: true,
                },
                {
                  holdingsNoteTypeId: HOLDING_NOTES.ACTION_NOTE,
                  note: notes.actionTwo,
                  staffOnly: true,
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
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C605959 Verify Bulk Edit actions for Holdings notes - Find-Replace (firebird)',
      { tags: ['criticalPath', 'firebird', 'C605959'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Action note', 'Administrative note');
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.noteReplaceWith('Administrative note', notes.adminTwo, newNotes.adminNote);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith('Action note', notes.actionOne, newNotes.actionNote, 1);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.holdingHRID);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          notes.adminOne,
          newNotes.adminNote,
          notes.actionTwo,
          newNotes.actionNote,
        ]);
        // TODO: uncomment after UIBULKED-425
        // BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', notes.adminOne);
        // BulkEditSearchPane.verifyChangesUnderColumns('Administrative note', newNotes.adminNote);
        // BulkEditSearchPane.verifyChangesUnderColumns('Action note', notes.actionTwo);
        // BulkEditSearchPane.verifyChangesUnderColumns('Action note', newNotes.actionNote);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote(notes.adminOne);
        HoldingsRecordView.checkAdministrativeNote(newNotes.adminNote);
        HoldingsRecordView.checkHoldingsNoteByRow([newNotes.actionNote, 'Yes'], 0);
        HoldingsRecordView.checkHoldingsNoteByRow([notes.actionTwo, 'Yes'], 1);
      },
    );
  });
});
