import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const matchedRecordsFileName = `Matched-Records-${instanceHRIDFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${instanceHRIDFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${instanceHRIDFileName}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditLogsView.gui,
    ]).then((userProperties) => {
      user = userProperties;

      item.instanceId = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      cy.getHoldings({
        limit: 1,
        expandAll: true,
        query: `"instanceId"="${item.instanceId}"`,
      }).then((holdings) => {
        item.holdingsHRID = holdings[0].hrid;
        cy.updateHoldingRecord(holdings[0].id, {
          ...holdings[0],
          discoverySuppress: true,
        });
      });
      cy.getInstanceById(item.instanceId).then((body) => {
        body.discoverySuppress = true;
        cy.updateInstance(body);
      });
      cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${item.instanceId}"` }).then(
        (instance) => {
          item.instanceHRID = instance.hrid;
          FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, item.instanceHRID);
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
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      instanceHRIDFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
    );
  });

  it(
    'C402326 Verify "Suppress from discovery" option is set to False when Holdings are suppressed and Items are not (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
      BulkEditSearchPane.uploadFile(instanceHRIDFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

      const suppressFromDiscovery = false;
      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
      BulkEditActions.checkApplyToItemsRecordsCheckbox();
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
      BulkEditSearchPane.verifyChangesUnderColumns(
        'Suppress from discovery',
        suppressFromDiscovery,
      );

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(instanceHRIDFileName, [item.instanceHRID]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [item.instanceHRID],
        'instanceHrid',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [item.instanceHRID],
        'instanceHrid',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [item.instanceHRID],
        'instanceHrid',
        true,
      );

      TopMenuNavigation.navigateToApp('Inventory');
      InventoryInstances.searchByTitle(item.instanceName);
      InventoryInstances.selectInstance();
      InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();

      TopMenuNavigation.navigateToApp('Inventory');
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      InventorySearchAndFilter.selectViewHoldings();
      HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();

      TopMenuNavigation.navigateToApp('Inventory');
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsAbsent();
    },
  );
});
