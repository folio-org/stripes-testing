import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Refresh lists', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('list'),
      recordType: 'Users',
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
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    beforeEach('Login', () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.resetAllFilters();
    });

    after('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411822  Refresh list: Inactive lists (corsair)',
      { tags: ['smoke', 'corsair', 'C411822'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Inactive');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.openActions();
        Lists.verifyRefreshListButtonDoesNotExist();
      },
    );

    it(
      "C411823 Refresh list: The list doesn't contain query (corsair)",
      { tags: ['criticalPath', 'corsair', 'C411823'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Inactive');
        Lists.saveList();
        Lists.openActions();
        Lists.verifyRefreshListButtonDoesNotExist();
      },
    );

    it(
      'C411824 Refresh list: Edit is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411824', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.saveList();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
        Lists.verifyRefreshListButtonDoesNotExist();
      },
    );

    it(
      'C411833 Refresh list: Export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411833', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportList();
        Lists.openActions();
        Lists.verifyRefreshListButtonIsDisabled();
      },
    );

    it(
      'C411834 Refresh list: Cancel Refresh - less than 500 records (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411834', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.openActions();
        Lists.cancelRefresh();
        cy.contains(`The refresh for ${listData.name} was successfully cancelled.`);
      },
    );

    it(
      'C411834 Refresh list: Cancel Refresh - more than 500 records (corsair)',
      { tags: ['criticalPathFlaky', 'corsair', 'C411834', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        cy.get('#field-option-0').click();
        cy.contains('User — Active').click();
        cy.get('[data-testid="operator-option-0"]').select('==');
        cy.get('[data-testid="data-input-select-boolType"]').select('False');
        cy.get('button:contains("Test query")').click();
        cy.wait(7000);
        cy.get('button:contains("Run query & save")').click();
        cy.wait(1000);
        Lists.openActions();
        Lists.cancelRefresh();
        cy.contains(
          `Error: the refresh for ${listData.name} was not cancelled. Verify a refresh is in progress and try again`,
        );
      },
    );
  });
});
