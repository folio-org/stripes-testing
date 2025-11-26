import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Add new list', () => {
    const firstUser = {};
    const secondUser = {};
    const listData = {
      name: getTestEntityValue('list'),
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
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
        firstUser.username = userProperties.username;
        firstUser.password = userProperties.password;
        firstUser.userId = userProperties.userId;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        secondUser.username = userProperties.username;
        secondUser.password = userProperties.password;
        secondUser.userId = userProperties.userId;
      });
    });

    after('Delete a user', () => {
      cy.getUserToken(firstUser.username, firstUser.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      "C411710 Verify that private list isn't visible for the other users (corsair)",
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411710', 'eurekaPhase1'] },
      () => {
        // cy.waitForAuthRefresh(() => {
        //   cy.login(firstUser.username, firstUser.password, {
        //     path: TopMenu.listsPath,
        //     waiter: Lists.waitLoading,
        //   });
        //   cy.reload();
        //   Lists.waitLoading();
        // }, 20_000);

        cy.login(firstUser.username, firstUser.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.verifyListIsNotPresent(listData.name);
      },
    );
  });
});
