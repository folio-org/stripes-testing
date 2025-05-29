import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let holdingsHRID;
let instanceHRID;
const invalidItemBarcodes = getRandomPostfix();
const invalidInstanceHrid = getRandomPostfix();
const validHoldingsHRIDFileName = `validHoldingsHRID_${getRandomPostfix()}.csv`;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.wait(5000);
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` }).then((holdings) => {
          holdingsHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${validHoldingsHRIDFileName}`, holdingsHRID);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
          (instance) => {
            instanceHRID = instance.hrid;
            FileManager.createFile(
              `cypress/fixtures/${instanceHRIDFileName}`,
              `${instanceHRID}\r\n${invalidInstanceHrid}`,
            );
          },
        );
        FileManager.createFile(
          `cypress/fixtures/${invalidItemBarcodesFileName}`,
          invalidItemBarcodes,
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
      FileManager.deleteFile(`cypress/fixtures/${validHoldingsHRIDFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    });

    it(
      'C360119 Verify that different Holdings identifiers are supported for Bulk edit (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C360119'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(validHoldingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditActions.openActions();
        TopMenuNavigation.navigateToApp('Bulk edit');

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(holdingsHRID);
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidInstanceHrid,
          `Instance not found by hrid=${invalidInstanceHrid}`,
          'Warning',
        );
        BulkEditActions.openActions();
        TopMenuNavigation.navigateToApp('Bulk edit');

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          invalidItemBarcodes,
          `Item not found by barcode=${invalidItemBarcodes}`,
          'Warning',
        );
        BulkEditActions.openActions();
      },
    );
  });
});
