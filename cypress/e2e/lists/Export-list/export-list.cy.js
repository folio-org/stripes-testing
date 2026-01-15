import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Export query', {
    retries: {
      runMode: 1,
    },
  },
  () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('list'),
      recordType: 'Users',
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
      'C411809 Export list: Not canned lists (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411809', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.exportList();
        Lists.verifySuccessCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );
        cy.wait(3000);
        Lists.verifySuccessCalloutMessage(
          `List ${listData.name} was successfully exported to CSV.`,
        );
      },
    );

    it(
      'C411811 Export list: Inactive lists (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411811', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus('Inactive');
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.openActions();
        Lists.verifyExportListButtonIsDisabled();
      },
    );

    it(
      'C411812 Export list: Refresh is in progress (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411812'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.openActions();
        Lists.verifyExportListButtonIsDisabled();
        Lists.waitForCompilingToComplete();
      },
    );

    it(
      'C411813 Export list: Edit is in progress, when the list contains records (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411813', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        Lists.queryBuilderActions();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
      },
    );

    it(
      "C411830 Export list: Edit is in progress, when the list doesn't have query (corsair)",
      { tags: ['criticalPath', 'corsair', 'C411830', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
      },
    );

    it(
      "C411819 Export list: The list doesn't contain query (corsair)",
      { tags: ['smoke', 'corsair', 'C411819', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.openActions();
        Lists.verifyExportListButtonIsDisabled();
      },
    );

    it(
      'C411837 Export list: Edit is in progress, when the list has active query with 0 records (corsair)',
      { tags: ['obsolete', 'corsair', 'C411837'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        cy.get('#field-option-0').click();
        cy.contains('User — Last name, first name').click();
        cy.get('[data-testid="operator-option-0"]').select('==');
        cy.get('[data-testid="input-value-0"]').type('ABCD');
        cy.get('button:contains("Test query")').click();
        cy.wait(4000);
        cy.get('button:contains("Run query & save")').click();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
      },
    );
  });
});
