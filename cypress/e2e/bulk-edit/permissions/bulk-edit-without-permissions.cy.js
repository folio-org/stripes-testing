import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password);
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it('C368012 Verify that the user without "Bulk edit - Can view logs" permission cannot access to the logs. (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.verifyNoPermissionWarning();
    });
  });
});
