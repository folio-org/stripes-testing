import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C692_package_${getRandomPostfix()}`,
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsSearchAndView,
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearch,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    // after('Deleting user, data', () => {

    // });

    it(
      'C1295 Create a new Agreement and attach a package (spitfire)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        EHoldingSearch.switchToPackages();
      },
    );
  });
});
