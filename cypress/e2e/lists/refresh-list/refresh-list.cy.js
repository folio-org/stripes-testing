import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Refresh lists', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
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
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it('C411822  Refresh list: Inactive lists (corsair)', { tags: ['smoke', 'corsair'] }, () => {
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.selectStatus('Inactive');
      Lists.buildQuery();
      Lists.queryBuilderActions();
      Lists.actionButton();
      cy.contains('Refresh list').should('be.disabled');
    });

    it(
      "C411823 Refresh list: The list doesn't contain query (corsair)",
      { tags: ['criticalPath', 'corsair'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Inactive');
        Lists.saveList();
        Lists.actionButton();
        cy.contains('Refresh list').should('be.disabled');
      },
    );

    it(
      'C411824 Refresh list: Edit is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.saveList();
        Lists.actionButton();
        Lists.editList();
        Lists.actionButton();
        cy.contains('Refresh list').should('not.exist');
      },
    );

    it(
      'C411833 Refresh list: Export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        cy.wait(17000);
        cy.contains('View updated list').click();
        Lists.actionButton();
        cy.contains('Export all columns (CSV)').click();
        Lists.actionButton();
        cy.contains('Refresh list').should('be.disabled');
      },
    );

    it(
      'C411834 Refresh list: Cancel Refresh - less than 500 records (corsair)',
      { tags: ['criticalPath', 'corsair', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.actionButton();
        Lists.cancelRefresh();
        cy.contains(`The refresh for ${listData.name} was successfully cancelled.`);
      },
    );

    it(
      'C411834 Refresh list: Cancel Refresh - more than 500 records (corsair)',
      { tags: ['criticalPathFlaky', 'corsair', 'eurekaPhase1'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Active');
        Lists.buildQuery();
        cy.get('#field-option-0').click();
        cy.contains('User - Active').click();
        cy.get('[data-testid="operator-option-0"]').select('==');
        cy.get('[data-testid="data-input-select-boolType"]').select('False');
        cy.get('button:contains("Test query")').click();
        cy.wait(7000);
        cy.get('button:contains("Run query & save")').click();
        cy.wait(9000);
        Lists.actionButton();
        Lists.cancelRefresh();
        cy.contains(
          `Error: the refresh for ${listData.name} was not cancelled. Verify a refresh is in progress and try again`,
        );
      },
    );
  });
});
