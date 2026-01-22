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
      cy.getAdminToken();
      cy.createTempUser([
        permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        permissions.uieHoldingsRecordsEdit.gui,
        permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      EHoldingsPackages.getPackageViaApi(testData.customPackageName).then(({ body }) => {
        if (body.data && body.data[0]) {
          EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
        }
      });
    });

    it(
      'C692 Create a custom package (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C692'] },
      () => {
        EHoldingSearch.switchToPackages();
        cy.intercept('eholdings/packages').as('createPackage');
        EHoldingsPackages.verifyCustomPackage(testData.customPackageName);
        cy.wait('@createPackage').then(() => {
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.verifyPackageName(testData.customPackageName);
          EHoldingsPackageView.verifyPackageType('Custom');
          EHoldingsPackageView.close();
          EHoldingSearch.switchToPackages();
          EHoldingsPackages.verifyPackageExistsViaAPI(testData.customPackageName, true, 60);
          EHoldingsPackagesSearch.byName(testData.customPackageName);
          EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
        });
      },
    );
  });
});
