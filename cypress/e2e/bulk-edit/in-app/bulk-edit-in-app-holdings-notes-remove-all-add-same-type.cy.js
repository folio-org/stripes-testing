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
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import { HOLDING_NOTES } from '../../../support/constants';

let user;

const notes = {
  admin: 'Admin_Note_text',
  binding: 'Note_text',
  provenance: 'provenance-Note_text',
  reproduction: 'reproduction-Note_text',
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
                  holdingsNoteTypeId: HOLDING_NOTES.BINDING_NOTE,
                  note: notes.binding,
                  staffOnly: false,
                },
                {
                  holdingsNoteTypeId: HOLDING_NOTES.PROVENANCE_NOTE,
                  note: notes.provenance,
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
      'C422072 Verify Bulk Edit actions for Holdings notes - Remove all and Add the same type (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C422072'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [`FOLIO,,,,${notes.admin},`]);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          `,${notes.binding},,,,${notes.provenance},`,
        ]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Administrative note',
          'Binding note',
          'Provenance note',
          'Reproduction note',
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.noteRemoveAll('Administrative note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteRemoveAll('Binding', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Reproduction', notes.reproduction, 2);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Administrative note', ['']);
        BulkEditActions.verifyChangesInAreYouSureForm('Binding note', ['']);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, ['FOLIO,,,,,']);
        ExportFile.verifyFileIncludes(previewFileName, [
          `,${notes.provenance},${notes.reproduction},`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumns('Administrative note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Binding note', '');
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, ['FOLIO,,,,,']);
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          `,${notes.provenance},${notes.reproduction},`,
        ]);

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(item.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote('-');
        HoldingsRecordView.checkHoldingsNote(notes.provenance, 0);
        HoldingsRecordView.checkHoldingsNote(notes.reproduction, 1);
      },
    );
  });
});
