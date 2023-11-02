import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const items = [];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;
// prepare names for 5 instances with 2 items = 10 items
for (let i = 0; i < 5; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  });
}

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        let fileContent = '';
        items.forEach((item) => {
          item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
          fileContent += `${item.itemBarcode}\r\n${item.secondBarcode}\r\n`;
          InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
            null,
            '1',
            '2',
            item.accessionNumber,
          );
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
      });
    });

    after('delete test data', () => {
      items.forEach((item) => InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode));
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C388491 Verify that User with "Bulk Edit: Local View" and "Bulk Edit: In app - Edit inventory" permissions CAN\'T edit user records (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyItemIdentifiersDefaultState();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.verifyItemActionDropdownItems();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.replaceTemporaryLocation('Online');
        BulkEditActions.verifyModifyLandingPageAfterModifying();
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.itemsRadioIsDisabled(false);
        BulkEditSearchPane.holdingsRadioIsDisabled(false);
        BulkEditSearchPane.verifyRadioHidden('Users');
      },
    );
  });
});
