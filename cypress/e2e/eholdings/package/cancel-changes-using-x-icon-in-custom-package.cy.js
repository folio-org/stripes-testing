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
      customPackageName: `C423476_package_${getRandomPostfix()}`,
    };

    before('Creating user, logging in', () => {
      cy.getAdminToken();
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
      'C423476 Cancel changes made in not saved custom "Package" record using "X" icon (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423476'] },
      () => {
        EHoldingSearch.switchToPackages();

        EHoldingsPackages.waitLoading();
        EHoldingsPackages.createNewPackage();
        EHoldingsNewCustomPackage.waitLoading();

        EHoldingsNewCustomPackage.verifyButtonsDisabled();
        EHoldingsNewCustomPackage.fillInRequiredProperties(testData.customPackageName);
        EHoldingsNewCustomPackage.verifyButtonsEnabled();
        EHoldingsNewCustomPackage.closeEditingWindow();

        EHoldingsNewCustomPackage.verifyUnsavedChangesModalExists();
        EHoldingsNewCustomPackage.clickKeepEditing();

        EHoldingsNewCustomPackage.verifyNameFieldValue(testData.customPackageName);
        EHoldingsNewCustomPackage.verifyButtonsEnabled();

        EHoldingsNewCustomPackage.closeEditingWindow();
        EHoldingsNewCustomPackage.verifyUnsavedChangesModalExists();

        EHoldingsNewCustomPackage.clickContinueWithoutSaving();

        EHoldingsPackages.waitLoading();
      },
    );
  });
});
