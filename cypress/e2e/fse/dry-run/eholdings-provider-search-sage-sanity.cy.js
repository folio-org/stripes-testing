import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('eHoldings', () => {
  describe('Provider', () => {
    const { user, memberTenant } = parseSanityParameters();

    beforeEach(() => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.eholdingsPath,
        waiter: EHoldingsPackages.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });

    it(
      'C682 Search providers for [Sage] (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C682'] },
      () => {
        const providerTitle = 'SAGE';
        EHoldingsProvidersSearch.byProvider(providerTitle);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(providerTitle);
      },
    );
  });
});
