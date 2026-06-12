import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';

let user;
let locationId;
let locationToReplace;
const invalidItemUUID = getRandomPostfix();
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);

        Locations.getViaApiAnyDefault(2).then((locations) => {
          locationId = locations[0].id;
          locationToReplace = locations[1].name;

          cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
            (res) => {
              item.itemId = res.id;
              res.permanentLocation = { id: locationId };
              res.temporaryLocation = { id: locationId };

              cy.updateItemViaApi(res);
              FileManager.createFile(
                `cypress/fixtures/${itemUUIDsFileName}`,
                `${item.itemId}\r\n${invalidItemUUID}`,
              );
            },
          );
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
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
      { tags: ['criticalPath', 'firebird', 'C397354'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Permanent loan type',
          'Item permanent location',
          'Item temporary location',
          'Item UUID',
        );
        BulkEditSearchPane.verifyMatchedResults(item.itemId);
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.itemId]);
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        const location = locationToReplace;

        BulkEditActions.replaceTemporaryLocation(location);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.itemId);
        BulkEditActions.clickX();
        BulkEditActions.closeBulkEditInAppForm();
        cy.reload();
        cy.wait(3000);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.openStartBulkEditForm();

        BulkEditActions.fillPermanentLoanType('Selected');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        BulkEditActions.confirmChanges();
        BulkEditActions.clickKeepEditingBtn();
        BulkEditActions.closeBulkEditInAppForm();
        BulkEditSearchPane.verifyMatchedResults(item.itemId);

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.verifyMatchedResults(item.itemId);

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.replacePermanentLocation(location);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangesUnderColumns('Item permanent location', location);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyPermanentLocation(location);
      },
    );
  });
});
