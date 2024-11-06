import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
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
import {
  APPLICATION_NAMES,
  electronicAccessRelationshipId,
  electronicAccessRelationshipName,
} from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
                  relationshipId: electronicAccessRelationshipId.RESOURCE,
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
      'C422222 Verify Bulk Edit for Holding with populated " URL relationship" in electronic access (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422222'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Electronic access');
        BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          electronicAccessRelationshipName.RESOURCE,
        ]);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.isSelectActionAbsent();
        BulkEditActions.selectOption('URL Relationship');
        let possibleActions = ['Clear field', 'Find (full field search)', 'Replace with'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectSecondAction('Clear field');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        BulkEditActions.verifyOptionAbsentInNewRow('URL Relationship');
        BulkEditActions.deleteRow(1);
        BulkEditActions.findValue('URL Relationship');
        possibleActions = ['Replace with', 'Remove'];
        BulkEditActions.verifyPossibleActions(possibleActions);
        BulkEditActions.selectSecondAction('Remove');
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.selectType(electronicAccessRelationshipName.RESOURCE, 0, 0);
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.checkTypeNotExist(electronicAccessRelationshipName.RESOURCE, 0, 1);
        BulkEditActions.selectType(electronicAccessRelationshipName.VERSION_OF_RESOURCE, 0, 1);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.selectType(electronicAccessRelationshipName.VERSION_OF_RESOURCE, 0, 0);
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.selectAction('Replace with');
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.selectType(electronicAccessRelationshipName.VERSION_OF_RESOURCE, 0, 0);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '1 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditActions.verifyChangesInAreYouSureForm('Electronic access', [
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        ]);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Electronic access',
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings HRID', item.holdingsHRID);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.verifyElectronicAccess(
          electronicAccessRelationshipName.VERSION_OF_RESOURCE,
        );
      },
    );
  });
});
