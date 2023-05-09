import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

let user;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditQueryView.gui,
      permissions.bulkEditUpdateRecords.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C375213 Verify that "Actions" are hidden if user has NO permissions to see the specified record type (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.logActionsIsAbsent();
  });
});
