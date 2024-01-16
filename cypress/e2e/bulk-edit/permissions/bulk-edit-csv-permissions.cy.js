import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import users from '../../../support/fragments/users/users';

let userWithCsvViewPermission;
let userWithCsvPermissions;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([permissions.bulkEditCsvView.gui]).then((userProperties) => {
        userWithCsvViewPermission = userProperties;
      });

      cy.createTempUser([permissions.bulkEditCsvView.gui, permissions.bulkEditCsvEdit.gui]).then(
        (userProperties) => {
          userWithCsvPermissions = userProperties;
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      users.deleteViaApi(userWithCsvViewPermission.userId);
    });

    it(
      'C350903 Verify "Bulk Edit: Local - View user records" permissions (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        cy.login(userWithCsvViewPermission.username, userWithCsvViewPermission.password);
        cy.visit(TopMenu.bulkEditPath);

        BulkEditSearchPane.verifyCsvViewPermission();
      },
    );

    // TODO: think about dragging file without dropping
    it(
      'C353537 Verify label to the Drag and drop area -- Local approach (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        cy.login(userWithCsvPermissions.username, userWithCsvPermissions.password);
        cy.visit(TopMenu.bulkEditPath);

        BulkEditSearchPane.actionsIsAbsent();
      },
    );
  });
});
