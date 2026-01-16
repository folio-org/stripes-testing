import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Edit list',
    {
      retries: {
        runMode: 1,
      },
    }, () => {
      let firstUser = {};
      let secondUser = {};
      let listData;

      beforeEach('Create a user', () => {
        listData = {
          name: getTestEntityValue('list'),
          recordType: 'Loans',
          status: 'Active',
        };

        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiUsersView.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiUsersViewLoans.gui,
          Permissions.uiOrganizationsView.gui,
        ]).then((userProperties) => {
          firstUser = userProperties;
        });
        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiUsersView.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiUsersViewLoans.gui,
          Permissions.uiOrganizationsView.gui,
        ]).then((userProperties) => {
          secondUser = userProperties;
        });
      });

      afterEach('Delete a user', () => {
        cy.getUserToken(firstUser.username, firstUser.password);
        Lists.deleteListByNameViaApi(listData.name);
        cy.getAdminToken();
        Users.deleteViaApi(firstUser.userId);
        Users.deleteViaApi(secondUser.userId);
      });

      it(
        'C411733 Edit list: Make the list Private (corsair)',
        { tags: ['smoke', 'corsair', 'shiftLeft', 'C411733', 'eurekaPhase1'] },
        () => {
          cy.login(firstUser.username, firstUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.name);
          Lists.selectRecordType(listData.recordType);
          Lists.selectVisibility('Shared');
          Lists.saveList();
          Lists.verifyListIsSaved(listData.name);
          Lists.closeListDetailsPane();
          // User B logs in to make sure that 'Shared' list is visible
          cy.login(secondUser.username, secondUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.selectSharedLists();
          Lists.verifyListIsPresent(listData.name);
          // User A logs in to make the list 'Private'
          cy.login(firstUser.username, firstUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.selectSharedLists();
          Lists.selectList(listData.name);
          Lists.openActions();
          Lists.editList();
          Lists.selectVisibility('Private');
          Lists.saveList();
          Lists.closeListDetailsPane();
          // User B logs in to make sure that 'Private' list is not visible
          cy.login(secondUser.username, secondUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.selectPrivateLists();
          Lists.verifyListIsNotPresent(listData.name);
        },
      );

      it(
        'C411736 Edit list: Make the list Shared (corsair)',
        { tags: ['smoke', 'corsair', 'shiftLeft', 'C411736', 'eurekaPhase1'] },
        () => {
          cy.login(firstUser.username, firstUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.name);
          Lists.selectRecordType(listData.recordType);
          Lists.selectVisibility('Private');
          Lists.saveList();
          Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
          Lists.closeListDetailsPane();
          // User B logs in to make sure that 'Shared' list is not visible
          cy.login(secondUser.username, secondUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.verifyListIsNotPresent(listData.name);
          // User A logs in to make the list 'Shared'
          cy.login(firstUser.username, firstUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.selectPrivateLists();
          Lists.openList(listData.name);
          Lists.openActions();
          Lists.editList();
          Lists.selectVisibility('Shared');
          Lists.saveList();
          Lists.closeListDetailsPane();
          // User B logs in to make sure that 'Shared' list is visible
          cy.login(secondUser.username, secondUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.resetAllFilters();
          Lists.selectSharedLists();
          Lists.verifyListIsPresent(listData.name);
        },
      );
    });
});
