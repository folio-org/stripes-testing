import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Add new list', () => {
    const { user, memberTenant } = parseSanityParameters();
    let listData = {};

    beforeEach('Create a user', () => {
      listData = {
        name: getTestEntityValue('list'),
        recordType: 'Loans',
      };
      cy.setTenant(memberTenant.id);
    });

    afterEach('Delete a user', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      Lists.deleteListByNameViaApi(listData.name);
    });

    it(
      'C411704 Create new lists: Private list (corsair)',
      { tags: ['dryRun', 'corsair', 'C411704'] },
      () => {
        listData.status = 'Active';
        listData.visibility = 'Private';

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
        Lists.selectStatus(listData.status);
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
