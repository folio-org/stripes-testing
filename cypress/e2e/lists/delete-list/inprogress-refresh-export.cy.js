import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Delete list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Users',
      status: 'Active',
      visibility: 'Shared',
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
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411770 Delete list: Refresh is in progress (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
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
        Lists.buildQuery();
        Lists.queryBuilderActions();
        cy.wait(1000);
        Lists.actionButton();
        Lists.verifyDeleteListButtonIsDisabled();
        cy.wait(7000);
        Lists.viewUpdatedList();
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C411771 Delete list: Export is in progress (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
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
        Lists.buildQuery();
        Lists.queryBuilderActions();
        cy.wait(10000);
        Lists.viewUpdatedList();
        Lists.actionButton();
        Lists.exportList();
        Lists.actionButton();
        Lists.verifyDeleteListButtonIsDisabled();
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );
  });
});
