import permissions from '../../../support/dictionary/permissions';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C423475_package_${getRandomPostfix()}`,
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        permissions.uieHoldingsRecordsEdit.gui,
        permissions.uieHoldingsPackageTitleSelectUnselect.gui,
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
      'C423475 Cancel changes made in not saved custom "Package" record using "Cancel" button (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423475'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackages.waitLoading();

        EHoldingsPackages.createNewPackage();
        EHoldingsNewCustomPackage.waitLoading();

        EHoldingsNewCustomPackage.verifyButtonsDisabled();
        EHoldingsNewCustomPackage.fillInRequiredProperties(testData.customPackageName);
        EHoldingsNewCustomPackage.verifyButtonsEnabled();

        EHoldingsNewCustomPackage.cancelChanges();
        EHoldingsNewCustomPackage.verifyUnsavedChangesModalExists();
        EHoldingsNewCustomPackage.clickKeepEditing();

        EHoldingsNewCustomPackage.verifyNameFieldValue(testData.customPackageName);
        EHoldingsNewCustomPackage.verifyButtonsEnabled();

        EHoldingsNewCustomPackage.cancelChanges();
        EHoldingsNewCustomPackage.verifyUnsavedChangesModalExists();

        EHoldingsNewCustomPackage.clickContinueWithoutSaving();
        EHoldingsPackages.waitLoading();
      },
    );
  });
});
