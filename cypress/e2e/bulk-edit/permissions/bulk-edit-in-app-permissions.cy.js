import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let userWithInAppViewPermission;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test users', () => {
      cy.createTempUser([permissions.bulkEditView.gui]).then((userProperties) => {
        userWithInAppViewPermission = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      users.deleteViaApi(userWithInAppViewPermission.userId);
    });

    it(
      'C350936 Verify "Bulk Edit: In app - View inventory records" permissions (firebird)',
      { tags: ['smoke', 'firebird', 'C350936'] },
      () => {
        cy.login(userWithInAppViewPermission.username, userWithInAppViewPermission.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

        BulkEditSearchPane.verifyInAppViewPermission();
      },
    );
  });
});
