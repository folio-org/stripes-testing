import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411698 Verify the pagination, when the user has less than 100 records (corsair)',
      { tags: ['extendedPath', 'corsair', 'C411698'] },
      () => {
        // Step 1: Click on "Lists" in app navigation bar
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Step 2: Check the pagination - both Previous and Next buttons are inactive
        // Step 3: Hover over the "Next" button - cursor remains arrow and button is inactive
        // Step 4: Hover over the "Previous" button - cursor remains arrow and button is inactive
        Lists.verifyLandingPagePaginationButtonsState({ previous: true, next: true });
      },
    );
  });
});
