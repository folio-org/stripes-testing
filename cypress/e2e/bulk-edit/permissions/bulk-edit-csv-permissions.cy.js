import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
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
      users.deleteViaApi(userWithCsvViewPermission.userId);
    });

    it(
      'C350903 Verify "Bulk Edit: Local - View user records" permissions (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        cy.login(userWithCsvViewPermission.username, userWithCsvViewPermission.password);
        cy.visit(TopMenu.bulkEditPath);

        BulkEditSearchPane.verifyCsvViewPermission();
      },
    );

    // TODO: think about dragging file without dropping
    it(
      'C353537 Verify label to the Drag and drop area -- Local approach (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        cy.login(userWithCsvPermissions.username, userWithCsvPermissions.password);
        cy.visit(TopMenu.bulkEditPath);

        BulkEditSearchPane.actionsIsAbsent();
      },
    );
  });
});
