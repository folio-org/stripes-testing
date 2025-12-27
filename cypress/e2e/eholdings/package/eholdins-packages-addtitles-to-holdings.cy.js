import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    let user;
    const testData = {
      packageName: 'Examstutor',
    };

    beforeEach(() => {
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.getUserToken(userProperties.username, userProperties.password);
        EHoldingsPackages.unassignPackageViaAPI(testData.packageName);
        EHoldingsPackages.waitForPackageStatusChangeViaAPI(testData.packageName, false);
      });
    });

    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C688 Add all titles in a package to your holdings (spitfire)',
      { tags: ['smoke', 'spitfire', 'C688'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });

        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackage();
        EHoldingsPackage.waitLoading(testData.packageName);
        EHoldingsPackage.addToHoldings();

        cy.getToken(user.username, user.password);
        EHoldingsPackages.waitForPackageStatusChangeViaAPI(testData.packageName, true);
        EHoldingsPackage.verifySelectedPackage();
        EHoldingsPackage.filterTitles();
        EHoldingsPackage.checkEmptyTitlesList();
        // reset test data
        EHoldingsPackage.removeFromHoldings();
        EHoldingsPackage.verifyNotSelectedPackage();
      },
    );
  });
});
