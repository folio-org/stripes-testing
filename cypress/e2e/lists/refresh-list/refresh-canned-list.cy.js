import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Refresh lists', () => {
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

    it(
      'C411820 Refresh list: Canned lists (corsair)',
      { tags: ['smokeBroken', 'corsair', 'C411820'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.openActions();
        Lists.getViaApi().then((response) => {
          const filteredItem = response.body.content.find(
            (item) => item.name === 'Inactive patrons with open loans',
          );
          cy.intercept('GET', `lists/${filteredItem.id}`).as('getRecords');
        });
        Lists.refreshList();
        cy.wait('@getRecords').then((interception) => {
          const totalRecords = interception.response.body.successRefresh.recordsCount;
          cy.contains(`Refresh complete with ${totalRecords} records: View updated list`).should(
            'be.visible',
          );
          Lists.viewUpdatedList();
          cy.contains(`${totalRecords} records found`).should('be.visible');
        });
      },
    );
  });
});
