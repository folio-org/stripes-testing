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
        Permissions.uieHoldingsRecordsEdit.gui,
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
  });
});
