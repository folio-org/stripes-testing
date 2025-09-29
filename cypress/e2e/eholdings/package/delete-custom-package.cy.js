import { Permissions } from '../../../support/dictionary';
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
      customPackageName: `C605986_package_${getRandomPostfix()}`,
    };
    let user;

    before('Create user, create custom package and login', () => {
      cy.createTempUser([
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
            },
          },
        }).then(() => {
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C605986 Delete a custom package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C605986'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyPackageType('Custom');

        EHoldingsPackages.deletePackage();
        EHoldingsPackages.verifyDetailsPaneAbsent(testData.customPackageName);

        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        EHoldingsPackages.verifyPackageNotInSearchResults(testData.customPackageName);
      },
    );
  });
});
