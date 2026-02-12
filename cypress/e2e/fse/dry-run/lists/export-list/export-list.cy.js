import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Export query', () => {
    const { user, memberTenant } = parseSanityParameters();
    const listData = {
      name: getTestEntityValue('list'),
      recordType: 'Users',
      visibility: 'Shared',
    };

    beforeEach('Create a user', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
    });

    afterEach('Delete a user', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      Lists.deleteListByNameViaApi(listData.name);
    });

    it(
      'C411809 Export list: Not canned lists (corsair)',
      { tags: ['dryRun', 'corsair', 'C411809'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();
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
      { tags: ['dryRun', 'corsair', 'C411811'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();
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
      { tags: ['dryRun', 'corsair', 'C411812'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();
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
  });
});
