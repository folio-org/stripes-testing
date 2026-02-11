import { Lists } from '../../../../../support/fragments/lists/lists';
import TopMenu from '../../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const { user, memberTenant } = parseSanityParameters();

    const duplicateListData = {
      name: 'Inactive patrons 0 with open loans - copy',
      description: 'Returns all loans with a status of open by inactive users',
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create test data', () => {
      cy.setTenant(memberTenant.id);
    });

    after('Delete test data', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      Lists.deleteListByNameViaApi(duplicateListData.name);
    });

    it(
      'C423614 Duplicate lists - Canned reports without modified data (corsair)',
      { tags: ['dryRun', 'corsair', 'C423614'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        cy.allure().logCommandSteps();

        Lists.verifyListIsPresent(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.openList(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.openActions();
        Lists.duplicateList();
        Lists.setName(duplicateListData.name);

        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${duplicateListData.name} saved.`);
        Lists.waitForCompilingToComplete(5000);

        Lists.closeListDetailsPane();
        Lists.verifyListIsPresent(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.verifyListIsPresent(duplicateListData.name);
        Lists.findResultRowIndexByContent(duplicateListData.name).then((rowIndex) => {
          Lists.checkResultSearch(duplicateListData, rowIndex);
        });
      },
    );
  });
});
