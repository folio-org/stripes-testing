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
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
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
      'C411808 Verify the Search & filter pane structure (athena)',
      { tags: ['criticalPath', 'athena', 'C411808'] },
      () => {
        // Step 1: Check the left pane
        // Verify search field is present, "Search" and "Reset all" buttons are disabled
        Lists.verifySearchFieldDisplayed();
        Lists.verifySearchButtonDisabled();
        Lists.verifyResetAllButtonDisabled();

        // Verify "Status" accordion is expanded. By default "Active" checkbox is selected
        Lists.verifyAccordionExpandedInFilter('Status');
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxUnchecked('Inactive');

        // Verify "Visibility" accordion is expanded
        Lists.verifyAccordionExpandedInFilter('Visibility');
        Lists.verifyCheckboxUnchecked('Shared');
        Lists.verifyCheckboxUnchecked('Private');

        // Verify "Source" accordion is expanded
        Lists.verifyAccordionExpandedInFilter('Source');
        Lists.verifyCheckboxUnchecked('System');
        Lists.verifyCheckboxUnchecked('User generated');

        // Verify "Created by", "Updated by", "Record types" accordions are expanded
        Lists.verifyAccordionExpandedInFilter('Created by');
        Lists.verifyAccordionExpandedInFilter('Updated by');
        Lists.verifyAccordionExpandedInFilter('Record types');

        // Step 2: Hover on the left hand arrow displays text "Collapse Search & filter pane"
        Lists.verifyCollapseFilterPaneTooltip();

        // Step 3: Click on the left hand arrow - collapse the pane
        Lists.collapseFilterPane();

        // Step 4: Hover on the right hand arrow displays text "Expand Search & filter pane"
        Lists.verifyExpandFilterPaneTooltip();

        // Step 5: Click on the right hand arrow - expand the pane
        Lists.expandFilterPane();
      },
    );

    it(
      'C411807 Verify that after clicking on "Reset all" button, all filters reset (athena)',
      { tags: ['extendedPath', 'athena', 'C411807'] },
      () => {
        // Step 1: Check the left pane
        // Verify search field is present, "Search" and "Reset all" buttons are disabled
        Lists.verifySearchFieldDisplayed();
        Lists.verifySearchButtonDisabled();
        Lists.verifyResetAllButtonDisabled();

        // Verify "Status" accordion is expanded. By default "Active" checkbox is selected
        Lists.verifyAccordionExpandedInFilter('Status');
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxUnchecked('Inactive');

        // Verify "Visibility" accordion is expanded
        Lists.verifyAccordionExpandedInFilter('Visibility');
        Lists.verifyCheckboxUnchecked('Shared');
        Lists.verifyCheckboxUnchecked('Private');

        // Verify "Source" accordion is expanded
        Lists.verifyAccordionExpandedInFilter('Source');
        Lists.verifyCheckboxUnchecked('System');
        Lists.verifyCheckboxUnchecked('User generated');

        // Verify "Created by", "Updated by", "Record types" accordions are expanded
        Lists.verifyAccordionExpandedInFilter('Created by');
        Lists.verifyAccordionExpandedInFilter('Updated by');
        Lists.verifyAccordionExpandedInFilter('Record types');

        // Step 2: Uncheck the "Active" status, verify "Reset all" button becomes active
        Lists.verifyClearFilterButton('Status');
        Lists.clickOnCheckbox('Active');
        Lists.verifyCheckboxUnchecked('Active');
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyClearFilterButtonAbsent('Status');

        // Step 3: Click on "Reset all" button, verify "Active" status is checked, "x" is displayed next to the "Status"
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyClearFilterButton('Status');

        // Step 4: Select option on each filter, verify "x" button appears next to each filter, "Reset all" button becomes active
        // Check the "Inactive" status
        Lists.clickOnCheckbox('Inactive');
        Lists.verifyCheckboxChecked('Inactive');
        Lists.verifyClearFilterButton('Status');
        Lists.verifyResetAllButtonEnabled();

        // Check "Shared" visibility
        Lists.verifyClearFilterButtonAbsent('Visibility');
        Lists.clickOnCheckbox('Shared');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyClearFilterButton('Visibility');
        Lists.verifyResetAllButtonEnabled();

        // Check "User generated" source
        Lists.verifyClearFilterButtonAbsent('Source');
        Lists.clickOnCheckbox('User generated');
        Lists.verifyCheckboxChecked('User generated');
        Lists.verifyClearFilterButton('Source');
        Lists.verifyResetAllButtonEnabled();

        // Select any user under "Created by"
        Lists.verifyClearFilterButtonAbsent('Created by');

        // Select any user under "Updated by"
        Lists.verifyClearFilterButtonAbsent('Updated by');

        // Select "Users" record type
        Lists.verifyClearFilterButtonAbsent('Record types');
        Lists.selectRecordTypeFilter([Lists.recordTypes.users]);
        Lists.verifyRecordTypeSelectedinFilter([Lists.recordTypes.users]);
        Lists.verifyClearFilterButton('Record types');
        Lists.verifyResetAllButtonEnabled();

        // Step 6: Click on "Reset all" button
        // Verify "Reset all" becomes inactive, "Active" status is checked
        Lists.resetAllFilters();
        Lists.verifyResetAllButtonDisabled();
        Lists.verifyClearFilterButton('Status');
        Lists.verifyCheckboxChecked('Active');

        // Verify filters reset, "x" buttons removed
        Lists.verifyClearFilterButtonAbsent('Visibility');
        Lists.verifyClearFilterButtonAbsent('Source');
        Lists.verifyClearFilterButtonAbsent('Created by');
        Lists.verifyClearFilterButtonAbsent('Updated by');
        Lists.verifyClearFilterButtonAbsent('Record types');

        // Verify "Created by" and "Updated by" accordions are expanded
        Lists.verifyAccordionExpandedInFilter('Created by');
        Lists.verifyAccordionExpandedInFilter('Updated by');
      },
    );
  });
});
