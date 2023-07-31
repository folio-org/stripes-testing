import TopMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import users from '../../../../support/fragments/users/users';

let userWithInAppViewPermission;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([permissions.bulkEditView.gui])
        .then(userProperties => {
          userWithInAppViewPermission = userProperties;
        });
    });

    after('delete test data', () => {
      users.deleteViaApi(userWithInAppViewPermission.userId);
    });

    it('C404402 Verify "Bulk edit: in app - view" permissions (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      cy.login(userWithInAppViewPermission.username, userWithInAppViewPermission.password);
      cy.visit(TopMenu.bulkEditPath);

      BulkEditSearchPane.verifyInAppViewPermission();
    });
  });
});
