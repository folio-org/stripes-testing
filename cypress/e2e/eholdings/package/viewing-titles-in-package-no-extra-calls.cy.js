import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';

describe('eHoldings', () => {
  describe('Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C350627_EH_Package_${randomPostfix}`,
      customTitleNamePrefix: `AT_C350627_EH_Title_${randomPostfix}`,
    };
    let user;

    before('Create user, data and login', () => {
      cy.then(() => {
        cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
          user = userProperties;
        });
        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
            },
          },
        }).then(({ data: { id } }) => {
          EHoldingsTitles.createEHoldingTitleVIaApi({
            titleName: `${testData.customTitleNamePrefix} 1`,
            packageId: id,
          });
          EHoldingsTitles.createEHoldingTitleVIaApi({
            titleName: `${testData.customTitleNamePrefix} 2`,
            packageId: id,
          });
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingSearch.switchToPackages();
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName, true);
    });

    it(
      'C350627 Verify multiple requests to /resources sent when viewing Titles list on Package Show page (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350627'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        cy.intercept('/eholdings/packages/*/resources*').as('getResources');
        EHoldingsPackages.openPackageWithExpectedName(testData.customPackageName);
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyTitlesSearchElements();
        EHoldingsPackageView.verifyFilteredTitlesCount(2);
        EHoldingsPackage.verifyTitleFound(`${testData.customTitleNamePrefix} 1`);
        EHoldingsPackage.verifyTitleFound(`${testData.customTitleNamePrefix} 2`);
        cy.get('@getResources.all').should('have.length', 1);
      },
    );
  });
});
