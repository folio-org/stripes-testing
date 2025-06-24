import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user1;
let user2;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user1 = userProperties;
      });
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'faculty',
      ).then((userProperties) => {
        user2 = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
          (res) => {
            item.itemId = res.id;
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.itemId);
            FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user2.barcode);
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user2.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C380394 Verify that bulk edit jobs run by correct user in case deleting one of them (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C380394'] },
      () => {
        cy.login(user1.username, user1.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

        cy.intercept('/bulk-operations/*').as('fileUpload');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        cy.wait('@fileUpload', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user1.userId);
        });
        BulkEditSearchPane.waitFileUploading();

        const newLocation = 'Online';
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(newLocation, 'item', 0);
        cy.intercept('/bulk-operations/*').as('confirmChanges');
        BulkEditActions.confirmChanges();
        cy.wait('@confirmChanges', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user1.userId);
        });
        cy.intercept('/bulk-operations/*').as('commitChanges');
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        cy.wait('@commitChanges', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user1.userId);
        });
        cy.getAdminToken();
        Users.deleteViaApi(user1.userId);
        cy.wait(5000);

        cy.login(user2.username, user2.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        cy.intercept('/bulk-operations/*').as('fileUpload2');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        cy.wait('@fileUpload2', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user2.userId);
        });
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('staff (Staff Member)');
        cy.intercept('/bulk-operations/*').as('confirmChanges2');
        BulkEditActions.confirmChanges();
        cy.wait('@confirmChanges2', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user2.userId);
        });
        cy.intercept('/bulk-operations/*').as('commitChanges2');
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        cy.wait('@commitChanges2', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user2.userId);
        });
      },
    );
  });
});
