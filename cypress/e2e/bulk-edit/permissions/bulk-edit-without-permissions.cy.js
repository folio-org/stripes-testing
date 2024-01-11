import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
let userWithQueryView;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;
      });

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        userWithQueryView = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userWithQueryView.userId);
    });

    it(
      'C347868 Verify that user without Bulk Edit: View permissions cannot access Bulk Edit app (firebird)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        cy.login(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.verifyNoPermissionWarning();
      },
    );

    it(
      'C413372 Verify Query tab permissions without Inventory and Users permissions (firebird)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        cy.login(userWithQueryView.username, userWithQueryView.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
      },
    );
  });
});
