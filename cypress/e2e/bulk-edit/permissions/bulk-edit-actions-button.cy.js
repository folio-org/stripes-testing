import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import users from '../../../support/fragments/users/users';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
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
      users.deleteViaApi(user.userId);
    });

    it(
      'C375213 Verify that "Actions" are hidden if user has NO permissions to see the specified record type (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.logActionsIsAbsent();
      },
    );
  });
});
