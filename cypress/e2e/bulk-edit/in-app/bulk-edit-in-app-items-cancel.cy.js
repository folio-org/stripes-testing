import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const invalidItemUUID = getRandomPostfix();
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.itemId = res.id;
            // Online
            res.permanentLocation = { id: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5' };
            // Online
            res.temporaryLocation = { id: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5' };
            cy.updateItemViaApi(res);
            FileManager.createFile(
              `cypress/fixtures/${itemUUIDsFileName}`,
              `${item.itemId}\r\n${invalidItemUUID}`,
            );
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C397354 Verify CANCEL during Bulk edit Items In app (firebird) (TaaS)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(itemUUIDsFileName, 1, 1);
        BulkEditSearchPane.verifyPaneRecordsCount(1);

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Permanent loan type',
          'Item permanent location',
          'Item temporary location',
          'Item ID',
        );
        BulkEditSearchPane.verifyMatchedResults(item.itemId);
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemId]);
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();

        const location = 'Annex';
        BulkEditActions.replaceTemporaryLocation(location);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.itemId);
        BulkEditActions.clickX();
        BulkEditActions.closeBulkEditInAppForm();
        cy.reload();

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.fillPermanentLoanType('Selected');
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        BulkEditActions.confirmChanges();
        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.closeBulkEditInAppForm();
        BulkEditSearchPane.verifyMatchedResults(item.itemId);

        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(item.itemId);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.replacePermanentLocation(location);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangesUnderColumns('Item permanent location', location);
        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyPermanentLocation(location);
      },
    );
  });
});
