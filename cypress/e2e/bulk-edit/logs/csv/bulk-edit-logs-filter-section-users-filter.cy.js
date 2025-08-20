import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('Csv approach', () => {
      const users = [];
      const tastData = {
        usersAccordion: 'User',
      };
      const validItemUUIDsFileName = `validItemUUIDs_${getRandomPostfix()}.csv`;
      const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
      const item = {
        instanceName: `testBulkEdit_${getRandomPostfix()}`,
        itemBarcode: getRandomPostfix(),
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser(
          [permissions.bulkEditCsvView.gui, permissions.bulkEditLogsView.gui],
          'faculty',
        ).then((userProperties) => {
          users[0] = userProperties;
        });
        cy.createTempUser(
          [
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.inventoryAll.gui,
          ],
          'faculty',
        ).then((userProperties) => {
          users[1] = userProperties;
        });
        cy.createTempUser(
          [permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui],
          'faculty',
        ).then((userProperties) => {
          users[2] = userProperties;
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.wait(1000);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${item.itemBarcode}"`,
        })
          .then((instance) => {
            item.itemId = instance.items[0].id;
            FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemId);
            FileManager.createFile(
              `cypress/fixtures/${userBarcodesFileName}`,
              `${users[1].barcode}\n${users[2].barcode}`,
            );
          })
          .then(() => {
            cy.login(users[1].username, users[1].password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            cy.getUserToken(users[1].username, users[1].password);
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
            BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();

            cy.login(users[2].username, users[2].password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            cy.getUserToken(users[2].username, users[2].password);
            BulkEditSearchPane.checkUsersRadio();
            BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
            BulkEditSearchPane.uploadFile(userBarcodesFileName);
            BulkEditSearchPane.waitFileUploading();

            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.fillPatronGroup('staff (Staff Member)');
            BulkEditActions.confirmChanges();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();

            cy.login(users[0].username, users[0].password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            cy.getUserToken(users[0].username, users[0].password);
          });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
        users.forEach((user) => {
          Users.deleteViaApi(user.userId);
        });
        FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      });

      it(
        'C409495 Filters section: Users filter (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C409495'] },
        () => {
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();

          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.verifyClearSelectedButtonExists('Record types');
          BulkEditLogs.resetAllBtnIsDisabled(false);
          BulkEditLogs.verifyLogsTableHeaders();

          BulkEditLogs.clickUserAccordion();
          BulkEditLogs.clickChooseUserUnderUserAccordion();

          BulkEditLogs.fillUserFilterInput(users[1].username);
          BulkEditLogs.selectUserFromDropdown(users[1].username);
          BulkEditLogs.verifyClearSelectedButtonExists(tastData.usersAccordion);
          BulkEditLogs.resetAllBtnIsDisabled(false);
          cy.wait(3000);
          BulkEditLogs.verifyCellsValues(
            8,
            `${users[1].username}, ${users[1].preferredFirstName} ${Users.defaultUser.personal.middleName}`,
          );

          BulkEditLogs.clickChooseUserUnderUserAccordion();
          BulkEditLogs.fillUserFilterInput(users[2].username);
          BulkEditLogs.selectUserFromDropdown(users[2].username);
          BulkEditLogs.verifyClearSelectedButtonExists(tastData.usersAccordion);
          BulkEditLogs.resetAllBtnIsDisabled(false);
          cy.wait(3000);
          BulkEditLogs.verifyCellsValues(
            8,
            `${users[2].username}, ${users[2].preferredFirstName} ${Users.defaultUser.personal.middleName}`,
          );

          BulkEditLogs.clickClearSelectedButton(tastData.usersAccordion);
          BulkEditLogs.verifyClearSelectedButtonExists(tastData.usersAccordion, false);
          BulkEditLogs.verifyLogsPaneHeader();

          BulkEditLogs.clickChooseUserUnderUserAccordion();
          BulkEditLogs.fillUserFilterInput(users[1].username);
          BulkEditLogs.selectUserFromDropdown(users[1].username);
          BulkEditLogs.verifyClearSelectedButtonExists(tastData.usersAccordion);
          BulkEditLogs.resetAllBtnIsDisabled(false);
          cy.wait(3000);
          BulkEditLogs.verifyCellsValues(
            8,
            `${users[1].username}, ${users[1].preferredFirstName} ${Users.defaultUser.personal.middleName}`,
          );

          BulkEditLogs.clickChooseUserUnderUserAccordion();
          BulkEditLogs.fillUserFilterInput(users[0].username);
          BulkEditLogs.verifyUserIsNotInUserList(users[0].username);
        },
      );
    });
  });
});
