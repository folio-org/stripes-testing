import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import EHoldingsProviderView from '../../../support/fragments/eholdings/eHoldingsProviderView';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageId: '19-160',
      packageName: 'Academic Search Premier',
      columnsToHide: ['Managed embargo period', 'Custom embargo period', 'Publication type'],
    };
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
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
      'C1282793 Package detail record: Data column selection is retained after switching between records and panes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1282793'] },
      () => {
        // Step 1: Verify all columns are shown by default and check all checkboxes
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.checkAllShowColumnsCheckboxes();
        EHoldingsPackageView.verifyTitlesShowColumnsCheckboxes();
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);

        // Step 2: Re-open Actions menu and confirm all checkboxes are checked
        EHoldingsPackageView.clickActionsButtonInTitlesSection();
        EHoldingsPackageView.verifyTitlesShowColumnsCheckboxes();

        // Step 3: Uncheck some columns - only those columns disappear from the table
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.uncheckShowColumnCheckbox(column);
        });
        EHoldingsPackageView.clickActionsButtonInTitlesSection(false);
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });

        // Step 4: Click on a Title (Resource) in the Titles accordion - Package+Title record opens
        EHoldingsPackageView.selectTitleRecord(0);

        // Step 5: Close the Package+Title record - back to Package, columns retained
        EHoldingsResourceView.closeHoldingsResourceView();
        EHoldingsPackageView.waitLoading();
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });

        // Step 6: Click on Provider link in Package information accordion - Provider record opens
        EHoldingsPackageView.clickProviderLink();

        // Step 7: Close the Provider record - back to Package, columns retained
        EHoldingsProviderView.close();
        EHoldingsPackageView.waitLoading();
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });

        // Step 8: Edit the Package record (Actions -> Edit, change proxy, Save & close) - columns retained
        EHoldingsPackage.editProxyActions();
        EHoldingsProviderEdit.changeProxy();
        EHoldingsPackage.saveAndClose();
        EHoldingsPackageView.waitLoading();
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });

        // Step 9: Open a Title, edit it (Actions -> Edit, change proxy, Save & close), close it - columns retained
        EHoldingsPackageView.selectTitleRecord(0);
        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.changeProxy();
        EHoldingsResourceEdit.saveAndClose();
        for (let i = 0; i < 2; i++) {
          EHoldingsResourceView.closeHoldingsResourceView();
          EHoldingsResourceView.waitLoading();
        }
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });

        // Step 10: Edit Provider via Provider link (Actions -> Edit, change proxy, Save & close), close - columns retained
        EHoldingsPackageView.clickProviderLink();
        EHoldingsProviderView.edit();
        EHoldingsProviderEdit.changeProxy();
        EHoldingsProviderEdit.saveAndClose();
        EHoldingsProviderView.close();
        EHoldingsProviderView.waitLoading();
        EHoldingsProviderView.close();
        testData.columnsToHide.forEach((column) => {
          EHoldingsPackageView.verifyColumnNotDisplayed(column);
        });
      },
    );
  });
});
