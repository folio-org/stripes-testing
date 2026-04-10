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
const validItemUUIDsFileName = `validItemUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser(
        [permissions.bulkEditView.gui, permissions.bulkEditEdit.gui, permissions.inventoryAll.gui],
        'faculty',
      ).then((userProperties) => {
        user1 = userProperties;
      });
      cy.createTempUser(
        [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
        'faculty',
      ).then((userProperties) => {
        user2 = userProperties;
      });

      InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${item.itemBarcode}"`,
      }).then((instance) => {
        item.itemId = instance.items[0].id;

        FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemId);
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${user1.barcode}\n${user2.barcode}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user1.userId);
      Users.deleteViaApi(user2.userId);
      FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C380393 Verify that bulk edit jobs run by correct user (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380393'] },
      () => {
        // Repeat steps 1-11 several times
        for (let i = 0; i < 3; i++) {
          // Step 1: Log into FOLIO as User_1 with open DevTools: Select "Inventory - items" radio button and "Item UUIDs" identifier
          cy.login(user1.username, user1.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

          const user1Id = user1.userId;
          // Step 2: Upload a .csv file with valid Item UUIDs
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`fileUpload_${i}`);
          BulkEditSearchPane.uploadFile(validItemUUIDsFileName);

          // Step 3: Check userId for the endpoint in DevTools
          cy.wait(`@fileUpload_${i}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user1Id);
          });
          BulkEditSearchPane.waitFileUploading();

          const newLocation = 'Online';

          // Step 4: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditForm();

          // Step 5-7: Replace temporary location with
          BulkEditActions.replaceTemporaryLocation(newLocation, 'item', 0);

          // Step 8: Click "Confirm changes" button
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`confirmChanges_${i}`);
          BulkEditActions.confirmChanges();

          // Step 9: Check userId in DevTools (should equal step 3)
          cy.wait(`@confirmChanges_${i}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user1Id);
          });

          // Step 10: Click "Commit changes" button
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`commitChanges_${i}`);
          BulkEditActions.commitChanges(false);

          // Step 11: Check userId in DevTools (should equal step 3 and 9)
          cy.wait(`@commitChanges_${i}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user1Id);
          });
          BulkEditSearchPane.waitFileUploading();
        }

        // Repeat steps 13-21 several times
        for (let j = 0; j < 3; j++) {
          // Step 13: Log into FOLIO as User_2: Select "Users" radio button and "User barcodes" identifier
          cy.login(user2.username, user2.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

          const user2Id = user2.userId;

          // Step 14: Upload a .csv file with valid users' barcodes
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`fileUpload2_${j}`);
          BulkEditSearchPane.uploadFile(userBarcodesFileName);

          // Step 15: Check userId in DevTools (should correspond to User_2)
          cy.wait(`@fileUpload2_${j}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user2Id);
          });
          BulkEditSearchPane.waitFileUploading();

          // Step 16: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditForm();

          // Step 17: Click "Select Option" dropdown => Select "Patron group" => Select different patron group
          BulkEditActions.fillPatronGroup('staff (Staff Member)');

          // Step 18: Click "Confirm changes" option
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`confirmChanges2_${j}`);
          BulkEditActions.confirmChanges();

          // Step 19: Check userId in DevTools (should correspond to User_2 and step 15)
          cy.wait(`@confirmChanges2_${j}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user2Id);
          });

          // Step 20: Click "Commit changes" button
          cy.intercept('GET', /\/bulk-operations\/[a-f0-9-]{36}$/).as(`commitChanges2_${j}`);
          BulkEditActions.commitChanges(false);

          // Step 21: Check userId in DevTools (should correspond to User_2 and step 15, 19)
          cy.wait(`@commitChanges2_${j}`, getLongDelay()).then((res) => {
            expect(res.response.body.userId).to.eq(user2Id);
          });
          BulkEditSearchPane.waitFileUploading();
        }
      },
    );
  });
});
