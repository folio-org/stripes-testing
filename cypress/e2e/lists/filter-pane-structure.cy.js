import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';

describe('Lists', () => {
  describe('Filter lists', () => {
    beforeEach(() => {
      cy.loginAsAdmin({ path: TopMenu.listsPath, waiter: Lists.waitLoading });
    });

    it(
      'C1444107 Verify the Filter pane structure (athena)',
      { tags: ['criticalPath', 'athena', 'C1444107'] },
      () => {
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxUnchecked('Inactive');
        Lists.verifyCheckboxUnchecked('Shared');
        Lists.verifyCheckboxUnchecked('Private');
        Lists.verifyResetAllButtonDisabled();

        Lists.collapseFilterPane();
        Lists.expandFilterPane();
      },
    );

    it(
      'C1444140 Verify that after clicking on "Reset all" button, all filters resets (athena)',
      { tags: ['criticalPath', 'athena', 'C1444140'] },
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
