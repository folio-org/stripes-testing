import permissions from '../../../support/dictionary/permissions';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C692_package_${getRandomPostfix()}`,
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
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
    });

    it('C692 Create a custom package (spitfire)', { tags: ['criticalPath', 'spitfire'] }, () => {
      EHoldingSearch.switchToPackages();
      EHoldingsPackages.verifyCustomPackage(testData.customPackageName);
      EHoldingsPackageView.waitLoading();
      EHoldingsPackageView.verifyPackageName(testData.customPackageName);
      EHoldingsPackageView.verifyPackageType('Custom');
      EHoldingsPackages.verifyPackageExistsViaAPI(testData.customPackageName, true);
      EHoldingsPackageView.close();
      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.byName(testData.customPackageName);
      EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
    });
  });
});
