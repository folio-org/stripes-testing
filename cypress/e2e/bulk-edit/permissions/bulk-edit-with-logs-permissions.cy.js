import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiInventoryViewInstances.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.clickToBulkEditMainButton();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C368013 Verify that the user with "Bulk edit - Can view logs" permission can access to the logs (firebird)',
      { tags: ['smoke', 'firebird', 'C368013'] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyTriggerLogsAction();
      },
    );
  });
});
