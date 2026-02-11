import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Add new list', () => {
    const { user, memberTenant } = parseSanityParameters();
    const listData = {
      name: getTestEntityValue('list'),
    };

    before('Create test data', () => {
      cy.setTenant(memberTenant.id);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      Lists.deleteListByNameViaApi(listData.name);
    });

    it(
      'C411705 Verify that created new list is visible on the "Lists" landing page (corsair)',
      { tags: ['dryRun', 'corsair', 'C411705'] },
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
        Lists.selectRecordType('Loans');
        Lists.selectVisibility('Shared');
        Lists.selectStatus('Active');
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );
  });
});
