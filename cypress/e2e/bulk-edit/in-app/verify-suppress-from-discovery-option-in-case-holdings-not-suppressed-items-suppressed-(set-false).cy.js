import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

let user;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const matchedRecordsFileName = `Matched-Records-${instanceHRIDFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${instanceHRIDFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${instanceHRIDFileName}`;

describe('Bulk Edits', () => {
  describe('Bulk Edit - Items', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.inventoryAll.gui,
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
      'C402323 Verify "Suppress from discovery" option in case Holdings not suppressed Items suppressed  (Set false) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();

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

        TopMenuNavigation.navigateToApp('Inventory');
        InventoryInstances.searchByTitle(item.instanceName);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();

        // BulkEditActions.openInAppStartBulkEditFrom();
        // BulkEditActions.verifyRowIcons();

        // BulkEditActions.verifyTheOptionsAfterSelectedAllOptions('Suppress from discovery', 0);
      },
    );
  });
});
