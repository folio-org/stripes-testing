import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { LOCATION_IDS } from '../../../support/constants';

let user;
const items = [];
for (let i = 0; i < 5; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  });
}
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
let fileContent = '';

// Test cannot be automated after test case update
describe.skip('bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        items.forEach((item) => {
          item.secondItemBarcode = `secondBarcode_${item.itemBarcode}`;
          fileContent += `${item.itemBarcode}\n${item.secondItemBarcode}\n`;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        });

        items.forEach((item) => {
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.secondItemBarcode}"`,
          }).then((res) => {
            res.temporaryLocation = { id: LOCATION_IDS.ANNEX };
            cy.updateItemViaApi(res);
          });

          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.itemBarcode}"`,
          }).then((res) => {
            // Online
            res.temporaryLocation = { id: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5' };
            cy.updateItemViaApi(res);
          });
        });
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C358976 Verify preview after updating less than 10 records (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C358976'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        cy.intercept('preview?limit=10&step=UPLOAD').as('fileUpload');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        cy.wait('@fileUpload', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(10);
        });
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item temporary location');
        const location = 'Annex';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location);
        cy.intercept('preview?limit=10&step=EDIT').as('confirmChanges');
        BulkEditActions.confirmChanges();
        cy.wait('@confirmChanges', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(10);
        });
        cy.intercept('preview?limit=10&step=COMMIT').as('commitChanges');
        cy.intercept('errors?limit=10').as('commitErrors');
        BulkEditActions.commitChanges();
        cy.wait('@commitChanges', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(5);
        });
        cy.wait('@commitErrors', getLongDelay()).then((res) => {
          expect(res.response.body.errors).to.have.length(5);
        });
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(5);
      },
    );
  });
});
