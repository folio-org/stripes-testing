import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Add new list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
    };

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
      'C411709 Verify that the button "Cancel", cancels new list creation process. (corsair)',
      { tags: ['criticalPath', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.cancelList();
        Lists.verifyCancellationModal();
        Lists.keepEditing();
        cy.url().should('include', '/new');
        Lists.cancelList();
        Lists.closeWithoutSaving();
        cy.url().should('include', '/lists');
      },
    );
  });
});
