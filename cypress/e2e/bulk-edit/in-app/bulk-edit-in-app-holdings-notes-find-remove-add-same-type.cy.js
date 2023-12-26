import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
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
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
const notes = {
  action: 'Test [sample] no*te',
  elbook: 'elbook Test [sample] no*te',
  note: 'test note',
};
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const holdingHRIDsFileName = `holdingHRIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${holdingHRIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingHRIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingHRIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
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
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            administrativeNotes: [notes.admin],
            notes: [
              { // Action note
                holdingsNoteTypeId: 'd6510242-5ec3-42ed-b593-3585d2e48fd6',
                note: notes.action,
                staffOnly: false,
              },
              { // Electronic bookplate note
                holdingsNoteTypeId: '88914775-f677-4759-b57b-1a33b90b24e0',
                note: notes.elbook,
                staffOnly: false,
              },
            ],
          });
          FileManager.createFile(`cypress/fixtures/${holdingHRIDsFileName}`, holdings[0].hrid);
        });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, changedRecordsFileName, previewFileName);
    });

    it(
      'C422070 Verify Bulk Edit actions for Holdings notes - Find-Remove and Add the same type (firebird) (TaaS)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,Action note;${notes.action};false|Electronic bookplate;${notes.elbook};false,`,
        ]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Action note',
          'Electronic bookplate note',
          'Note',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.noteRemove('Action note', notes.action);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Note', notes.note, 1);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Action note', ['']);
        BulkEditActions.verifyChangesInAreYouSureForm('Note', [notes.note]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`,Electronic bookplate;${notes.elbook};false|Note;${notes.note};false,`]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Action note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Note', notes.note);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [`,Electronic bookplate;${notes.elbook};false|Note;${notes.note};false,`]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkHoldingsNote(notes.elbook, 0);
        HoldingsRecordView.checkHoldingsNote(notes.note, 1);
        ItemRecordView.verifyTextAbsent('Action note');
      },
    );
  });
});
