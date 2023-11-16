import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';

describe('eHoldings', () => {
  describe('Provider', () => {
    let userId;

    beforeEach(() => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsPackages.waitLoading,
        });
      });
    });

    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C694 Search providers for [Gale | Cengage]. Then Search list of packages on Provider detail record for all selected packages (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        EHoldingsProvidersSearch.byProvider('Gale Cengage');
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.clickSearchIcon();
        EHoldingsProviders.bySelectionStatusOpen('Selected');
        EHoldingsProviders.verifyOnlySelectedPackagesInResults();
      },
    );

    it(
      'C682 Search providers for [Sage] (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        const providerTitle = 'SAGE';
        EHoldingsProvidersSearch.byProvider(providerTitle);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(providerTitle);
      },
    );

    it(
      'C367967 Verify that "Packages" accordion will return records after collapsing/expanding in "Provider" detail record. (spitfire)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        const providerTitle = 'Wiley';
        const expanded = 'true';
        const collapsed = 'false';
        const collapseAll = 'Collapse all';
        const expandAll = 'Expand all';
        
        EHoldingsProvidersSearch.byProvider(providerTitle);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(providerTitle);
        EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
        EHoldingsProviders.verifyPackagesAvailable();
        EHoldingsProviders.packageAccordionClick();
        EHoldingsProviders.verifyPackagesAccordionExpanded(collapsed);
        EHoldingsProviders.packageAccordionClick();
        EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
        EHoldingsProviders.verifyPackagesAvailable();
        EHoldingsProviders.verifyPackageButtonClick(collapseAll, collapsed);
        EHoldingsProviders.packageAccordionClick();
        EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
        EHoldingsProviders.verifyPackagesAvailable();
        EHoldingsProviders.packageAccordionClick();
        EHoldingsProviders.verifyPackagesAccordionExpanded(collapsed);
        EHoldingsProviders.verifyPackageButtonClick(expandAll, expanded);
        EHoldingsProviders.verifyPackagesAccordionExpanded(expanded);
        EHoldingsProviders.verifyPackagesAvailable();
      },
    );
  });
});
