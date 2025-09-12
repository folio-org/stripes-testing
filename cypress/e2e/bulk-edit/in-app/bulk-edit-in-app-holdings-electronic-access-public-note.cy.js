import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const item = {
  instanceName: `AT_C422240_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const publicNote = 'My URL public note';
const newPublicNote = 'My new URL public note';
const editedPublicNote = ' URL public note';
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
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

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
          (holdings) => {
            item.holdingsHRID = holdings[0].hrid;
            FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              electronicAccess: [
                {
                  publicNote,
                  uri: 'uri.com',
                },
              ],
            });
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422240 Verify Bulk Edit for Holding populated with "URL public note" in electronic access (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422240'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.verifySpecificItemsMatched(publicNote);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [publicNote]);
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.isSelectActionAbsent();
        BulkEditActions.selectOption('URL public note');
        let possibleActions = ['Clear field', 'Find', 'Replace with'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectSecondAction('Clear field');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        BulkEditActions.verifyOptionAbsentInNewRow('URL public note');
        BulkEditActions.deleteRow(1);
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.fillInSecondTextArea(publicNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.findValue('URL public note');
        possibleActions = ['Replace with', 'Remove'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInFirstTextArea('My');
        BulkEditActions.fillInSecondTextArea(newPublicNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.selectSecondAction('Remove');
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '1 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, editedPublicNote);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [`;uri.com;;;${editedPublicNote}"`]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(4, editedPublicNote);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [';uri.com;;; URL public note"']);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.verifyElectronicAccessByElementIndex(4, editedPublicNote);
      },
    );
  });
});
