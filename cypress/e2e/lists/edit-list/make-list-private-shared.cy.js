import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Edit list', () => {
    const firstUser = {};
    const secondUser = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: 'Active',
    };

    beforeEach('Create a user', () => {
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

    afterEach('Delete a user', () => {
      cy.getUserToken(firstUser.username, firstUser.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it('C411733 Edit list: Make the list Private (corsair)', { tags: ['smoke', 'corsair'] }, () => {
      cy.login(firstUser.username, firstUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.resetAllFilters();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility('Shared');
      Lists.saveList();
      Lists.verifyListIsSaved(listData.name);
      Lists.closeListDetailsPane();
      cy.wait(3000);
      // User B logs in to make sure that 'Shared' list is visible
      cy.login(secondUser.username, secondUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.selectSharedLists();
      Lists.verifyListIsPresent(listData.name);
      cy.wait(2000);
      // User A logs in to make the list 'Private'
      cy.login(firstUser.username, firstUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.selectSharedLists();
      Lists.selectList(listData.name);
      Lists.openActions();
      Lists.editList();
      Lists.selectVisibility('Private');
      Lists.saveList();
      Lists.closeListDetailsPane();
      cy.wait(3000);
      // User B logs in to make sure that 'Private' list is not visible
      cy.login(secondUser.username, secondUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.selectPrivateLists();
      Lists.verifyListIsNotPresent(listData.name);
    });

    it('C411736 Edit list: Make the list Shared (corsair)', { tags: ['smoke', 'corsair'] }, () => {
      cy.login(firstUser.username, firstUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.resetAllFilters();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility('Private');
      Lists.saveList();
      Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
      Lists.closeListDetailsPane();
      cy.wait(3000);
      // User B logs in to make sure that 'Shared' list is not visible
      cy.login(secondUser.username, secondUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.verifyListIsNotPresent(listData.name);
      cy.wait(2000);
      // User A logs in to make the list 'Shared'
      cy.login(firstUser.username, firstUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.openList(listData.name);
      Lists.openActions();
      Lists.editList();
      Lists.selectVisibility('Shared');
      Lists.saveList();
      Lists.closeListDetailsPane();
      cy.wait(3000);
      // User B logs in to make sure that 'Shared' list is visible
      cy.login(secondUser.username, secondUser.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.resetAllFilters();
      Lists.selectSharedLists();
      Lists.verifyListIsPresent(listData.name);
    });
  });
});
