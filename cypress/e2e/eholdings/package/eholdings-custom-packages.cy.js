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
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `C692_package_${randomPostfix}`,
      customPackageAlternateName: `C692_package_alternate_${randomPostfix}`,
      nonexistentPackageName: `C692_package_nonexistent_${randomPostfix}`,
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
      EHoldingsPackages.getPackageViaApi(testData.customPackageName).then(({ body }) => {
        if (body.data && body.data[0]) {
          EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
        }
      });
    });

    it(
      'C692 Create a custom package (promin)',
      { tags: ['criticalPath', 'promin', 'C692'] },
      () => {
        EHoldingSearch.switchToPackages();
        cy.intercept('eholdings/packages').as('createPackage');
        EHoldingsPackages.verifyCustomPackage(
          testData.customPackageName,
          undefined,
          undefined,
          testData.customPackageAlternateName,
        );
        cy.wait('@createPackage').then(() => {
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.verifyPackageName(testData.customPackageName);
          EHoldingsPackageView.verifyPackageType('Custom');
          EHoldingsPackageView.close();
          EHoldingSearch.switchToPackages();
          EHoldingsPackages.verifyPackageExistsViaAPI(testData.customPackageName, true, 60);
          EHoldingsPackagesSearch.byName(testData.customPackageName);
          EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
          EHoldingsPackagesSearch.byName(testData.nonexistentPackageName);
          EHoldingsPackages.checkNoResultsFound(testData.nonexistentPackageName);
          EHoldingsPackagesSearch.byName(testData.customPackageAlternateName);
          EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
        });
      },
    );
  });
});
