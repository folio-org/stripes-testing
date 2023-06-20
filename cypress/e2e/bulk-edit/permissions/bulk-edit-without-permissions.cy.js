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

    it('C347868\n' +
      'Verify that user without Bulk Edit: View permissions cannot access Bulk Edit app (firebird)', { tags: [testTypes.extendedPath, devTeams.firebird] }, () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.verifyNoPermissionWarning();
    });
  });
});
