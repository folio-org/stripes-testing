import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';

let user;
describe('bulk-edit', () => {
  before('create test users', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditView.gui,
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

  it('Filters section: Users filter', () => {
    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkHoldingsCheckbox();
    BulkEditSearchPane.checkItemsCheckbox();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.verifyLogsTableHeaders();
  });
});
