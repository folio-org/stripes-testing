import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import users from '../../../support/fragments/users/users';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditQueryView.gui,
        permissions.bulkEditUpdateRecords.gui,
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
      users.deleteViaApi(user.userId);
    });

    it(
      'C375213 Verify that "Actions" are hidden if user has NO permissions to see the specified record type (firebird)',
      { tags: ['smoke', 'firebird', 'C375213'] },
      () => {
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.logActionsIsAbsent();
      },
    );
  });
});
