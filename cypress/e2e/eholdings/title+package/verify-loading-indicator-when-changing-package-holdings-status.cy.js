import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    let user;
    const testData = {
      packageName: 'Oxford',
    };

    before('Create test user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        EHoldingSearch.switchToPackages();
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359002 Verify that a loading indicator displays under "Titles" accordion when user changes the holdings status of "Package" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C359002'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        EHoldingsPackages.openPackage();
        cy.wait(2000);
        EHoldingsPackage.removeFromHoldings();
        EHoldingsPackage.verifyTitlesLoadingIndicator();

        EHoldingsPackage.verifyNotSelectedPackage();
        EHoldingsPackage.addToHoldings();

        EHoldingsPackage.verifyTitlesLoadingIndicator();
        EHoldingsPackage.verifySelectedPackage();
      },
    );
  });
});
