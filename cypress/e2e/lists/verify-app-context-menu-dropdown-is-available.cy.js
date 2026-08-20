import Permissions from '../../support/dictionary/permissions';
import AppContextDropdown from '../../support/fragments/appContextDropdown';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const listName = `AT_C535523_List_${getRandomPostfix()}`;

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
          description: 'Test list for C535523',
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: true,
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
      cy.getAdminToken(false);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C535523 Verify that app context menu dropdown is available (athena)',
      { tags: ['criticalPath', 'athena', 'C535523'] },
      () => {
        // Step 1: Click on any existing List to open it
        Lists.openList(listName);
        Lists.verifyListNameLabel(listName);

        // Step 2: Click on the arrow-down icon next to the "Lists" logo
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.checkOptionInAppContextDropdownMenu('Lists app home');
        AppContextDropdown.checkOptionInAppContextDropdownMenu('Keyboard shortcuts');

        // Step 3: Click on "Lists app home"
        AppContextDropdown.clickOptionInAppContextDropdownMenu('Lists app home');
        Lists.waitLoading();

        // Step 4: Click on the arrow-down icon next to the "Lists" logo
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.checkOptionInAppContextDropdownMenu('Lists app home');
        AppContextDropdown.checkOptionInAppContextDropdownMenu('Keyboard shortcuts');

        // Step 5: Click on "Keyboard shortcuts"
        AppContextDropdown.clickOptionInAppContextDropdownMenu('Keyboard shortcuts');
        AppContextDropdown.verifyKeyboardShortcutsModalShown();
      },
    );
  });
});
