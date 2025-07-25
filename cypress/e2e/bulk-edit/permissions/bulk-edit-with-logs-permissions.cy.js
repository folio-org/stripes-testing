import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
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
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C651591 Verify that the user with "Bulk edit: Can view logs" permission can access to the logs (firebird)',
      { tags: ['smoke', 'firebird', 'C651591'] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        // steps have been added to stabilize the test case on the bugfest environment because there are many records there that are no longer available for download
        cy.wait(5000);
        BulkEditLogs.sortLogsTableByColumnHeader('Started');
        BulkEditLogs.sortLogsTableByColumnHeader('Started');
        cy.wait(5000);
        BulkEditLogs.clickActionsOnTheRow();
        BulkEditLogs.verifyTriggerLogsAction();
      },
    );
  });
});
