import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';

describe('Lists', () => {
  describe('Filter lists', () => {
    beforeEach(() => {
      cy.loginAsAdmin({ path: TopMenu.listsPath, waiter: Lists.waitLoading });
    });

    it(
      'C411808 Verify the Filter pane structure (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411808'] },
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
