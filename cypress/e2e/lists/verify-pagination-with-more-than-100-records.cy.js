import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const createdListNames = [];
    const totalLists = 101;

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
        const listNames = [];
        for (let i = 1; i <= totalLists; i++) {
          listNames.push(`AT_C411697_List_${i}_${getRandomPostfix()}`);
        }
        createdListNames.push(...listNames);

        cy.wrap(listNames).each((listName) => {
          const listData = {
            name: listName,
            description: 'Test list for C411697',
            recordType: 'Loans',
            fqlQuery: '',
            isActive: true,
            isPrivate: true,
          };
          Lists.createViaApi(listData);
        });
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      cy.wrap(createdListNames).each((listName) => {
        Lists.deleteListByNameViaApi(listName);
      });
      cy.getAdminToken(false);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411697 Verify the pagination, when the user has more than 100 records (athena)',
      { tags: ['criticalPath', 'athena', 'C411697'] },
      () => {
        // Step 1: Click on "Lists" in app navigation bar
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Step 2-4: Check the pagination - Previous inactive, Next active
        Lists.verifyLandingPagePaginationButtonsState({ previous: true, next: false });

        // Step 5: Click on the 'Next' button
        Lists.clickLandingPageNextButton();

        // Step 6: Check the pagination on the 2nd page
        Lists.verifyLandingPagePaginationButtonsState({ previous: false, next: true });

        // Step 7: Click on 'Previous' button on the 2nd page
        Lists.clickLandingPagePreviousButton();

        // Verify first page is displayed
        Lists.verifyLandingPagePaginationButtonsState({ previous: true, next: false });
      },
    );
  });
});
