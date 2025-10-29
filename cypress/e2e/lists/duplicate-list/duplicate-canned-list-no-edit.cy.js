import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const userData = {};

    const duplicateListData = {
      name: 'Inactive patrons 0 with open loans - copy',
      description: 'Returns all loans with a status of open by inactive users',
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(duplicateListData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C423614 Duplicate lists - Canned reports without modified data (corsair)',
      { tags: ['criticalPath', 'corsair', 'shiftLeft', 'C423614'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

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
