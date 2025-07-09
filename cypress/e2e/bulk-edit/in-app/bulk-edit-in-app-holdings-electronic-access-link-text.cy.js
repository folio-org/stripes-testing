import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
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
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const textWithSpecialCharacters = 'Te;st: [sample] li*nk$text';
const newLinkText = 'Special characters';
const replacedLinkText = `${newLinkText} [sample] li*nk$text`;
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
                  linkText: textWithSpecialCharacters,
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
      'C422230 Verify Bulk Edit for Holding populated with "Link text" in electronic access (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422230'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.verifySpecificItemsMatched(textWithSpecialCharacters);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [textWithSpecialCharacters]);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.isSelectActionAbsent();
        BulkEditActions.selectOption('Link text');
        let possibleActions = ['Clear field', 'Find', 'Replace with'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectAction('Clear field');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        BulkEditActions.verifyOptionAbsentInNewRow('Link text');
        BulkEditActions.deleteRow(1);
        BulkEditActions.selectAction('Replace with');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInFirstTextArea(newLinkText);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.findValue('Link text');
        possibleActions = ['Replace with', 'Remove'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.selectSecondAction('Remove');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInFirstTextArea('Te;st:');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.selectAction('Replace with');
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInFirstTextArea(newLinkText);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '1 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditActions.verifyChangesInAreYouSureForm('Electronic access', [replacedLinkText]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [replacedLinkText]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns('Electronic access', replacedLinkText);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [replacedLinkText]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.verifyElectronicAccess(replacedLinkText);
      },
    );
  });
});
