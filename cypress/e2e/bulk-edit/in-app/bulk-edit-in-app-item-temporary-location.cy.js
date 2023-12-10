import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

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

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        items.forEach((item) => {
          item.secondItemBarcode = `secondBarcode_${item.itemBarcode}`;
          fileContent += `${item.itemBarcode}\n${item.secondItemBarcode}\n`;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        });

        items.forEach((item) => {
          cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.secondItemBarcode}"` }).then(
            (res) => {
              // Annex
              res.temporaryLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
              cy.updateItemViaApi(res);
            },
          );

          cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
            (res) => {
              // Annex
              res.temporaryLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
              cy.updateItemViaApi(res);
            },
          );
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
      'C358977 Verify that 10 records returned in errors preview after updating records (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        cy.intercept('preview?limit=10&step=UPLOAD').as('fileUpload');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        cy.wait('@fileUpload', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(10);
        });
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        const location = 'Annex';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(location);
        cy.intercept('preview?limit=10&step=EDIT').as('confirmChanges');
        BulkEditActions.confirmChanges();
        cy.wait('@confirmChanges', getLongDelay()).then((res) => {
          expect(res.response.body.rows).to.have.length(10);
        });
        cy.intercept('errors?limit=10').as('commitErrors');
        BulkEditActions.commitChanges();
        cy.wait('@commitErrors', getLongDelay()).then((res) => {
          expect(res.response.body.errors).to.have.length(10);
        });
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabelAfterChanges(itemBarcodesFileName, 0, 10);
      },
    );
  });
});
