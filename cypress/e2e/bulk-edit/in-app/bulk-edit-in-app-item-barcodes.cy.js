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
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
const items = [];

// prepare names for 5 instances with 2 items = 10 items
for (let i = 0; i < 5; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  });
}

const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          let fileContent = '';
          items.forEach(item => {
            item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
            fileContent += `${item.itemBarcode}\r\n${item.secondBarcode}\r\n`;
            InventoryInstances.createInstanceViaApi(
              item.instanceName,
              item.itemBarcode,
              null,
              '1',
              '2',
              item.accessionNumber
            );
          });

          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
        });
    });

    after('delete test data', () => {
      items.forEach(item => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it('C358939 Verify that 10 records returned in preview of matched records after editing (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');

      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.openStartBulkEditForm();
      BulkEditActions.replaceTemporaryLocation('Annex');
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.verifySuccessBanner(10);
      BulkEditSearchPane.verifyLocationChanges(10, 'Annex');
      BulkEditActions.newBulkEdit();
    });

    it('C359210 Verify the in-app bulk edit permanent loan type (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');

      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.verifyItemActionDropdownItems();
      BulkEditActions.openStartBulkEditForm();
      BulkEditActions.verifyModifyLandingPageBeforeModifying();
      BulkEditActions.fillLoanType('Selected');
      BulkEditActions.verifyModifyLandingPageAfterModifying();
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();

      cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      items.forEach(item => {
        InventorySearch.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', item.instanceName);
        InventorySearch.selectSearchResultItem();
        InventoryInstance.openHoldings(['']);
        InventoryInstance.verifyLoan('Selected');
      });
    });
  });
});
