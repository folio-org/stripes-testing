import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('lists', () => {
  describe('Edit list', () => {
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

    it('C411731 Edit list: Canned reports (corsair)', { tags: ['smokeFlaky', 'corsair'] }, () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.resetAllFilters();
      Lists.expiredPatronLoan();
      Lists.actionButton();
      cy.contains('Edit list').should('be.disabled');
      Lists.closeListDetailsPane();
      Lists.waitLoading();
      Lists.missingItems();
      Lists.actionButton();
      cy.contains('Edit list').should('be.disabled');
    });
  });
});
