import { Permissions } from '../../../support/dictionary';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const showColumns = [
      'Status',
      'Managed coverage',
      'Custom coverage',
      'Managed embargo period',
      'Custom embargo period',
      'Publication type',
      'Access status type',
      'Tag(s)',
    ];
    const testData = {
      packageId: '19-160',
      packageName: 'Academic Search Premier',
      titleName: 'Acta Zoologica',
      allColumns: ['Title', ...showColumns],
      columnsToHide: ['Managed embargo period', 'Custom embargo period'],
    };
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: `${TopMenu.eholdingsPath}/packages/${testData.packageId}`,
          waiter: EHoldingsPackageView.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1259793 Package detail record: Select which title data columns to display (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1259793'] },
      () => {
        // Step 1: Verify all default columns are displayed in the Titles accordion
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.checkAllShowColumnsCheckboxes();
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);
        EHoldingsPackageView.findTitleInList(testData.titleName);
        EHoldingsPackageView.verifyTitlesTableColumns(testData.allColumns);

        // Step 2: Uncheck all "Show columns" checkboxes - only Title column remains
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.uncheckAllShowColumnsCheckboxes();
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);
        EHoldingsPackageView.verifyOnlyTitleColumnDisplayed();

        // Step 3: Collapse and expand Titles accordion - only Title column still shown
        EHoldingsPackageView.collapseTitlesSection();
        EHoldingsPackageView.expandTitlesSection();
        EHoldingsPackageView.verifyOnlyTitleColumnDisplayed();

        // Step 4: Check all checkboxes one by one and verify each column appears
        EHoldingsPackageView.clickActionsButtonInTitlesSection();

        showColumns.forEach((column) => EHoldingsPackageView.checkShowColumnCheckboxAndVerify(column));

        // Step 5: Uncheck some checkboxes - those columns are no longer displayed
        testData.columnsToHide.forEach((column) => EHoldingsPackageView.uncheckShowColumnCheckbox(column));
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);
        testData.columnsToHide.forEach((column) => EHoldingsPackageView.verifyColumnNotDisplayed(column));

        // Step 6: Search for a title - selected columns still displayed
        EHoldingsPackageView.searchWithinTitles(testData.titleName);
        EHoldingsPackageView.findTitleInList(testData.titleName);
        testData.columnsToHide.forEach((column) => EHoldingsPackageView.verifyColumnNotDisplayed(column));

        // Step 7: Apply "Selected" filter - searched title still shown with selected columns
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.filterTitlesBySelectionStatus('Selected');
        EHoldingsPackageView.findTitleInList(testData.titleName);
        testData.columnsToHide.forEach((column) => EHoldingsPackageView.verifyColumnNotDisplayed(column));
      },
    );
  });
});
