import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Duplicate list', () => {
    const userData = {};

    const listData = {
      name: `C423599-${getTestEntityValue('list')}`,
      description: `C423599-${getTestEntityValue('desc')}`,
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
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
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C423604 Duplicate lists - Canned reports with modified data (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C423604'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.openList(Lists.cannedListInactivePatronsWithOpenLoans);
        Lists.openActions();
        Lists.duplicateList();

        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectVisibility(listData.visibility);

        Lists.editQuery();
        Lists.changeQueryBoolValue(true);
        Lists.testQuery();
        Lists.runQueryAndSave();

        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.waitForCompilingToComplete();

        // Lists.closeListDetailsPane();
        // Lists.verifyListIsPresent(Lists.cannedListInactivePatronsWithOpenLoans);
        // Lists.verifyListIsPresent(listData.name);
      },
    );
  });
});
