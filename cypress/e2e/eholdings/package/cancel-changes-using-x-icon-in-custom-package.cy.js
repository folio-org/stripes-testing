import permissions from '../../../support/dictionary/permissions';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C423476_package_${getRandomPostfix()}`,
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        permissions.uieHoldingsRecordsEdit.gui,
        permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.waitForAuthRefresh(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingsTitlesSearch.waitLoading();
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
    });

    it(
      'C423476 Cancel changes made in not saved custom "Package" record using "X" icon (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423476'] },
      () => {
        EHoldingSearch.switchToPackages();

        EHoldingsPackages.waitLoading();
        EHoldingsPackages.createNewPackage();
        EHoldingsNewCustomPackage.waitLoading();

        EHoldingsPackage.verifyButtonsDisabled();
        EHoldingsNewCustomPackage.fillInRequiredProperties(testData.customPackageName);
        EHoldingsPackage.verifyButtonsEnabled();
        EHoldingsPackage.closeEditingWindow();

        EHoldingsPackage.verifyUnsavedChangesModalExists();
        EHoldingsPackage.clickKeepEditing();

        EHoldingsNewCustomPackage.verifyNameFieldValue(testData.customPackageName);
        EHoldingsPackage.verifyButtonsEnabled();

        EHoldingsPackage.closeEditingWindow();
        EHoldingsPackage.verifyUnsavedChangesModalExists();

        EHoldingsPackage.clickContinueWithoutSaving();

        EHoldingsPackages.waitLoading();
      },
    );
  });
});
