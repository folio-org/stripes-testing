import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Lists', () => {
  describe('Filter lists', () => {
    let userData;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    beforeEach(() => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411808 Verify the Search & filter pane structure (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411808'] },
      () => {
        // Step 2: Check the left pane
        // Verify search box with placeholder text "Search lists"
        Lists.verifySearchBox('Search lists');

        // Verify "Search" button is disabled
        Lists.verifySearchButtonDisabled();

        // Verify "Reset all" button is disabled
        Lists.verifyResetAllButtonDisabled();

        // Verify all accordions are expanded
        Lists.verifyAccordionExpandedInFilter('Status');
        Lists.verifyAccordionExpandedInFilter('Visibility');
        Lists.verifyAccordionExpandedInFilter('Source');
        Lists.verifyAccordionExpandedInFilter('Created by');
        Lists.verifyAccordionExpandedInFilter('Updated by');
        Lists.verifyAccordionExpandedInFilter('Record types');

        // Verify "Active" checkbox is selected by default in Status accordion
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxUnchecked('Inactive');

        // Verify Visibility accordion checkboxes
        Lists.verifyCheckboxUnchecked('Shared');
        Lists.verifyCheckboxUnchecked('Private');

        // Step 3: Hover on the left hand arrow
        Lists.verifyCollapseButtonTooltip('Collapse Search & filter pane');

        // Step 4: Click on the left hand arrow - collapse the pane
        Lists.collapseFilterPane();

        // Step 5: Click on the right hand arrow - expand the pane
        Lists.expandFilterPane();
      },
    );

    it(
      'C411807 Verify that after clicking on "Reset all" button, all filters resets (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411807'] },
      () => {
        Lists.verifyClearFilterButton('Status');
        Lists.clickOnCheckbox('Active');
        Lists.verifyCheckboxUnchecked('Active');
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyClearFilterButtonAbsent('Status');
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();

        Lists.clickOnCheckbox('Inactive');
        Lists.verifyCheckboxChecked('Inactive');
        Lists.verifyClearFilterButton('Status');
        Lists.verifyResetAllButtonEnabled();
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();

        Lists.verifyClearFilterButtonAbsent('Visibility');
        Lists.clickOnCheckbox('Shared');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyClearFilterButton('Visibility');
        Lists.verifyResetAllButtonEnabled();
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();

        Lists.verifyClearFilterButtonAbsent('Visibility');
        Lists.clickOnCheckbox('Private');
        Lists.verifyCheckboxChecked('Private');
        Lists.verifyClearFilterButton('Visibility');
        Lists.verifyResetAllButtonEnabled();
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();

        Lists.verifyClearFilterButtonAbsent('Record types');
        Lists.selectRecordTypeFilter('Users');
        Lists.verifyClearFilterButton('Record types');
        Lists.verifyResetAllButtonEnabled();
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();

        Lists.verifyCheckboxChecked('Active');
      },
    );
  });
});
