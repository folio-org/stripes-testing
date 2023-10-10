import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import testTypes from '../../../support/dictionary/testTypes';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user1;
let user2;
const validItemUUIDsFileName = `validItemUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  instanceId: '',
};

// TODO: identify how to stabilize flaky test

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditView.gui, permissions.bulkEditEdit.gui, permissions.inventoryAll.gui],
        'faculty',
      ).then((userProperties) => {
        user1 = userProperties;
        cy.login(user1.username, user1.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'faculty',
      ).then((userProperties) => {
        user2 = userProperties;
      });

      item.instanceId = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${item.itemBarcode}"` })
        .then((instance) => {
          item.itemId = instance.items[0].id;
        })
        .then(() => {
          FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemId);
          FileManager.createFile(
            `cypress/fixtures/${userBarcodesFileName}`,
            `${user1.barcode}\n${user2.barcode}`,
          );
        });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user1.userId);
      Users.deleteViaApi(user2.userId);
      FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C380393 Verify that bulk edit jobs run by correct user (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

        cy.intercept('/bulk-operations/*').as('fileUpload');
        BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
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
        BulkEditActions.commitChanges();
        cy.intercept('/bulk-operations/*').as('commitChanges2');
        BulkEditSearchPane.waitFileUploading();
        cy.wait('@commitChanges2', getLongDelay()).then((res) => {
          expect(res.response.body.userId).to.eq(user2.userId);
        });
      },
    );
  });
});
