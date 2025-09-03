import permissions from '../../../support/dictionary/permissions';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: 'Wiley',
      package: 'Wiley Online Library Originated From Wiley',
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        permissions.moduleeHoldingsEnabled.gui,
        permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        cy.waitForAuthRefresh(() => {
          cy.reload();
          EHoldingsTitlesSearch.waitLoading();
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
    });

    it(
      'C423464 Cancel changes made in saved "Package" record using "X" icon (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423464'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackages.waitLoading();

        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.waitLoading();
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        EHoldingsPackages.openPackage();
        EHoldingsPackage.waitLoading(testData.package);

        EHoldingsPackage.editProxyActions();
        EHoldingsProviderEdit.changeProxy();

        EHoldingsPackage.closeEditingWindow();
        EHoldingsPackage.verifyUnsavedChangesModalExists();
        EHoldingsPackage.clickKeepEditing();
        EHoldingsPackage.verifyUnsavedChangesModalNotExists();

        EHoldingsPackage.closeEditingWindow();
        EHoldingsPackage.verifyUnsavedChangesModalExists();
        EHoldingsPackage.clickContinueWithoutSaving();
        EHoldingsPackage.verifyUnsavedChangesModalNotExists();

        EHoldingsPackages.waitLoading();
      },
    );
  });
});
