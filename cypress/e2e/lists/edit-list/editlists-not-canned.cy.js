import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Edit list', {
    retries: {
      runMode: 1,
    },
  },
  () => {
    const userData = {};
    let listData = {};

    beforeEach('Create a user', () => {
      listData = {
        name: getTestEntityValue('list'),
        recordType: 'Users',
        status: ['Active', 'Inactive'],
        visibility: 'Private',
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
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411737 Edit list: Refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411737', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.openActions();
        Lists.verifyEditListButtonIsDisabled();
        Lists.viewUpdatedList();
        Lists.closeListDetailsPane();
      },
    );

    it(
      'C411738 Edit list: Export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411738', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.viewUpdatedList();
        Lists.openActions();
        Lists.exportList();
        Lists.openActions();
        Lists.verifyEditListButtonIsDisabled();
        Lists.closeListDetailsPane();
      },
    );

    it(
      'C411734 Edit list: Make the list Inactive (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411734', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status[0]);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.viewUpdatedList();
        Lists.closeListDetailsPane();
        Lists.openList(listData.name);
        Lists.openActions();
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

    it(
      'C411735 Edit list: Make the list Active (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411735', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
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
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        Lists.selectStatus('Active');
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        cy.contains(`${listData.name} is active. Refresh ${listData.name} to see list contents`);
        Lists.closeListDetailsPane();
        Lists.openList(listData.name);
      },
    );
  });
});
