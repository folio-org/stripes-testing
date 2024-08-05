import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Edit list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Users',
      status: ['Active', 'Inactive'],
      visibility: 'Private',
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
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.getViaApi().then((response) => {
        const filteredItem = response.body.content.find((item) => item.name === listData.name);
        Lists.deleteViaApi(filteredItem.id);
      });
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411737 Edit list: Refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.actionButton();
        cy.contains('Edit list').should('be.disabled');
        cy.wait(7000);
        cy.contains('View updated list').click();
        Lists.closeListDetailsPane();
        cy.reload();
      },
    );

    it(
      'C411738 Edit list: Export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        cy.wait(10000);
        cy.contains('View updated list').click();
        Lists.actionButton();
        cy.contains('Export list').click();
        cy.wait(1000);
        Lists.actionButton();
        cy.contains('Edit list').should('be.disabled');
        Lists.closeListDetailsPane();
        cy.reload();
      },
    );

    it(
      'C411734 Edit list: Make the list Inactive (corsair)',
      { tags: ['smoke', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        cy.wait(10000);
        cy.contains('View updated list').click();
        Lists.closeListDetailsPane();
        cy.contains(listData.name).click();
        Lists.actionButton();
        Lists.editList();
        Lists.selectStatus('Inactive');
        cy.contains('Warning: making status inactive will clear list contents.').should(
          'be.visible',
        );
        Lists.saveList();
        cy.contains('Inactive').should('be.visible');
        cy.contains('0 records found').should('be.visible');
      },
    );

    it('C411735 Edit list: Make the list Active (corsair)', { tags: ['smoke', 'corsair'] }, () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.resetAllFilters();
      Lists.selectInactiveLists();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.selectStatus(listData.status[1]);
      Lists.saveList();
      Lists.closeListDetailsPane();
      cy.wait(2000);
      cy.contains(listData.name).click();
      cy.wait(2000);
      Lists.actionButton();
      Lists.editList();
      Lists.selectStatus('Active');
      Lists.saveList();
      cy.contains(`List ${listData.name} saved.`);
      cy.contains(`${listData.name} is active. Refresh ${listData.name} to see list contents`);
      Lists.closeListDetailsPane();
      cy.wait(2000);
      cy.contains(listData.name).click();
    });
  });
});
