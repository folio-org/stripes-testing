import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditView.gui, permissions.bulkEditCsvView.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C368012 Verify that the user without "Bulk edit - Can view logs" permission cannot access to the logs. (firebird)',
      { tags: ['smoke', 'firebird', 'C368012'] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
      },
    );
  });
});
