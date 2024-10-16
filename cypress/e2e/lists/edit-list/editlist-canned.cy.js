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

    it(
      'C411731 Edit list: Canned reports (corsair)',
      { tags: ['smokeFlaky', 'corsair', 'C411731'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openExpiredPatronLoanList();
        Lists.openActions();
        Lists.verifyEditListButtonIsDisabled();
        Lists.verifyEditListButtonIsDisabled();
        Lists.closeListDetailsPane();
        Lists.missingItems();
        Lists.openActions();
        Lists.verifyEditListButtonIsDisabled();
      },
    );
  });
});
