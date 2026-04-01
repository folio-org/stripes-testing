import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Permissions', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiOrdersView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C476848 Verify that users with entity type permissions, but without list app permissions, cannot see the lists app (corsair)',
      { tags: ['extendedPath', 'corsair', 'C476848'] },
      () => {
        // #1 Login to FOLIO
        cy.login(userData.username, userData.password);
        cy.wait(1000);

        // #2 Click on the "Apps" dropdown and try to find the "Lists" app
        TopMenuNavigation.verifyNavigationItemAbsentOnTheBar('Lists');

        // #3 Try to find the "Lists" app using the direct URL
        cy.visit(TopMenu.listsPath);
        Lists.verifyNoPermissionWarning();
      },
    );
  });
});
