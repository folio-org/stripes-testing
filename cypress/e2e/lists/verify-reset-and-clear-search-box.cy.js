import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Lists', () => {
  describe('Search lists', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiOrganizationsViewEditDelete.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersDelete.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1434638 Verify that both the "Reset all" button and the "X" button clear the search box (athena)',
      { tags: ['extendedPath', 'athena', 'C1434638'] },
      () => {
        // #1 Open the Lists app and locate the "Search & filter" pane
        Lists.verifySearchFieldDisplayed();
        Lists.verifySearchFieldEmpty();
        Lists.verifyClearSearchButtonAbsent();
        Lists.verifySearchButtonDisabled();

        // #2 Click on the search input field and type a search term
        Lists.fillInSearchField('Lists');
        Lists.verifySearchFieldValue('Lists');
        Lists.verifyClearSearchButtonDisplayed();
        Lists.verifySearchButtonEnabled();

        // #3 Click the "X" button
        Lists.clickOnClearSearchButton();
        Lists.verifySearchFieldEmpty();
        Lists.verifyClearSearchButtonAbsent();
        Lists.verifySearchButtonDisabled();

        // #4 Click on the search input field and type a search term again
        Lists.fillInSearchField('Lists');
        Lists.verifySearchFieldValue('Lists');
        Lists.verifyClearSearchButtonDisplayed();
        Lists.verifySearchButtonEnabled();

        // #5 Locate and click the "Reset all" button
        Lists.resetAllFilters();
        Lists.verifySearchFieldEmpty();
        Lists.verifyClearSearchButtonAbsent();
        Lists.verifySearchButtonDisabled();
      },
    );
  });
});
