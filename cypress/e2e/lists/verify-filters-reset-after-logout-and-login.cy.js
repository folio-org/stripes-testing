import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const listName = `AT_C506689_List_${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
      ]).then((userProperties) => {
        userData = userProperties;

        cy.getUserToken(userData.username, userData.password);
        Lists.createViaApi({
          name: listName,
          description: 'Test list for C506689',
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: false,
        });

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listName);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C506689 Verify that the selected filters return to the default state when we logout and log in again (athena)',
      { tags: ['criticalPath', 'athena', 'C506689'] },
      () => {
        // Step 1: Select filters
        Lists.clickOnCheckbox('Inactive');
        Lists.clickOnCheckbox('Shared');
        Lists.selectRecordTypeFilter(Lists.recordTypes.users);

        // Verify filters are selected
        Lists.verifyCheckboxChecked('Inactive');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyRecordTypeSelectedinFilter([Lists.recordTypes.users]);

        // Step 2: Log out via profile dropdown
        cy.logout();

        // Step 3: Log in again and open Lists app
        cy.visit(TopMenu.listsPath);
        cy.inputCredentialsAndLogin(userData.username, userData.password);

        // Verify filters have returned to default state
        Lists.verifyVisibilityAccordionDefaultContent();
        Lists.verifyStatusAccordionDefaultContent();
        Lists.verifyRecordTypeSelectedinFilter([]);
      },
    );
  });
});
