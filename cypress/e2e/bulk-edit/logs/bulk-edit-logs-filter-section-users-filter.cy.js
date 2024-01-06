import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Bulk Edits › Bulk Edit logs - search and filters pane', () => {
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
      [permissions.bulkEditView.gui, permissions.bulkEditEdit.gui, permissions.inventoryAll.gui],
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
    cy.wait(2000);
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.wait(2000);
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `"items.barcode"=="${item.itemBarcode}"`,
    }).then((instance) => {
      item.itemId = instance.items[0].id;
      FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemId);
      FileManager.createFile(
        `cypress/fixtures/${userBarcodesFileName}`,
        `${users[1].barcode}\n${users[2].barcode}`,
      );
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(users[0].userId);
    Users.deleteViaApi(users[1].userId);
    Users.deleteViaApi(users[2].userId);
    FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
  });

  it(
    'C409495 Filters section: Users filter (firebird) (TaaS)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      cy.login(users[1].username, users[1].password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
      BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      cy.login(users[2].username, users[2].password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
      BulkEditSearchPane.uploadFile(userBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.fillPatronGroup('staff (Staff Member)');
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();

      cy.login(users[0].username, users[0].password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();

      BulkEditSearchPane.checkUsersCheckbox();
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.checkItemsCheckbox();
      BulkEditSearchPane.verifyClearSelectedButtonExists('Record types');
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyLogsTableHeaders();

      BulkEditSearchPane.clickUserAccordion();
      BulkEditSearchPane.clickChooseUserUnderUserAccordion();

      BulkEditSearchPane.fillUserFilterInput('cypress');
      cy.wait(1000);
      BulkEditSearchPane.verifyDropdown('cypress');

      BulkEditSearchPane.fillUserFilterInput(users[1].username);
      BulkEditSearchPane.verifyDropdown(users[1].username);
      BulkEditSearchPane.selectUserFromDropdown(users[1].username);
      cy.wait(1000);
      BulkEditSearchPane.verifyClearSelectedButtonExists(tastData.usersAccordion);
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyCellsValues(
        8,
        `${users[1].username}, ${users[1].firstName} ${Users.defaultUser.personal.middleName}`,
      );

      BulkEditSearchPane.clickChooseUserUnderUserAccordion();
      BulkEditSearchPane.fillUserFilterInput(users[2].username);
      BulkEditSearchPane.verifyDropdown(users[2].username);
      BulkEditSearchPane.selectUserFromDropdown(users[2].username);
      cy.wait(1000);
      BulkEditSearchPane.verifyClearSelectedButtonExists(tastData.usersAccordion);
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyCellsValues(
        8,
        `${users[2].username}, ${users[2].firstName} ${Users.defaultUser.personal.middleName}`,
      );

      BulkEditSearchPane.clickClearSelectedButton(tastData.usersAccordion);
      BulkEditSearchPane.verifyClearSelectedButtonExists(tastData.usersAccordion, false);
      BulkEditSearchPane.verifyLogsPaneHeader();

      BulkEditSearchPane.clickChooseUserUnderUserAccordion();
      BulkEditSearchPane.fillUserFilterInput(users[1].username);
      BulkEditSearchPane.verifyDropdown(users[1].username);
      BulkEditSearchPane.selectUserFromDropdown(users[1].username);
      cy.wait(1000);
      BulkEditSearchPane.verifyClearSelectedButtonExists(tastData.usersAccordion);
      BulkEditSearchPane.resetAllBtnIsDisabled(false);
      BulkEditSearchPane.verifyCellsValues(
        8,
        `${users[1].username}, ${users[1].firstName} ${Users.defaultUser.personal.middleName}`,
      );

      BulkEditSearchPane.clickChooseUserUnderUserAccordion();
      BulkEditSearchPane.fillUserFilterInput(users[0].username);
      BulkEditSearchPane.verifyUserIsNotInUserList(users[0].username);
      BulkEditSearchPane.verifyEmptyUserDropdown();
    },
  );
});
