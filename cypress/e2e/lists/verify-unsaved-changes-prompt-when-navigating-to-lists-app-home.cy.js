import Permissions from '../../support/dictionary/permissions';
import AppContextDropdown from '../../support/fragments/appContextDropdown';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const userData = {};

describe('Lists', () => {
  describe('New list page', () => {
    before('Create a user', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete a user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C566575 Verify that users are prompted about unsaved changes when creating a list when they click on "Lists app home" from the app context menu (athena)',
      { tags: ['extendedPath', 'athena', 'C566575'] },
      () => {
        // Step 1: Click on the "New" button on the top-right of the page
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        cy.url().should('include', '/new');

        // Step 2: Select any record type from the dropdown
        Lists.selectRecordType(Lists.recordTypes.users);

        // Step 3: Click on "Lists app home" from the App context menu
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.clickOptionInAppContextDropdownMenu('Lists app home');
        Lists.verifyCancellationModal();

        // Step 4: Click on "Keep editing"
        Lists.keepEditing();
        Lists.verifyCancellationModalAbsent();

        // Step 5: Repeat step 3 and click on "Close without saving"
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.clickOptionInAppContextDropdownMenu('Lists app home');
        Lists.verifyCancellationModal();
        Lists.closeWithoutSaving();
        Lists.waitLoading();
      },
    );
  });
});
