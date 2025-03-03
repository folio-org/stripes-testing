import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Export query', () => {
    const userData = {};

    before('Create a user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete a user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    // the test depends on test data - Inactive patrons with open loans
    it(
      'C411810 Export list: Canned lists (corsair)',
      { tags: ['smokeFlaky', 'corsair', 'C411810', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.openActions();
        Lists.exportList();
        cy.contains(
          'Export of Inactive patrons with open loans is being generated. This may take some time for larger lists.',
        );
        cy.contains('List Inactive patrons with open loans was successfully exported to CSV.');
      },
    );
  });
});
