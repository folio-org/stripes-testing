import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let userWithCsvViewPermission;
let userWithCsvPermissions;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
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
      { tags: ['smoke', 'firebird', 'C350903'] },
      () => {
        cy.login(userWithCsvViewPermission.username, userWithCsvViewPermission.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

        BulkEditSearchPane.verifyCsvViewPermission();
      },
    );

    // TODO: think about dragging file without dropping
    it(
      'C353537 Verify label to the Drag and drop area -- Local approach (firebird)',
      { tags: ['smoke', 'firebird', 'C353537'] },
      () => {
        cy.login(userWithCsvPermissions.username, userWithCsvPermissions.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

        BulkEditSearchPane.actionsIsAbsent();
      },
    );
  });
});
