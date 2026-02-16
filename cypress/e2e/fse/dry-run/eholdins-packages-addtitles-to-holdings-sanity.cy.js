import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const { user, memberTenant } = parseSanityParameters();

    const testData = {
      packageName: 'Examstutor',
    };

    beforeEach(() => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      EHoldingsPackages.unassignPackageViaAPI(testData.packageName);
      EHoldingsPackages.waitForPackageStatusChangeViaAPI(testData.packageName, false);
    });

    it(
      'C688 Add all titles in a package to your holdings (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C688'] },
      () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();

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
