import { Permissions } from '../../../support/dictionary';
import EHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import EHoldingsProviderView from '../../../support/fragments/eholdings/eHoldingsProviderView';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('eHoldings', () => {
  describe('Provider', () => {
    let userId;

    beforeEach(() => {
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
      });
    });
    it(
      'C696 Edit proxy setting (spitfire)',
      { tags: ['smoke', 'spitfire', 'broken', 'C696'] },
      () => {
        const specialProvider = 'Johns Hopkins University Press';
        EHoldingsProvidersSearch.byProvider(specialProvider);
        EHoldingsProviders.viewProvider();
        EHoldingsProviderView.edit(specialProvider);
        EHoldingsProviderEdit.waitLoading(specialProvider);
        EHoldingsProviderEdit.changeProxy().then((newProxy) => {
          EHoldingsProviderEdit.saveAndClose();
          // additional delay related with update of proxy information in ebsco services
          cy.wait(10000);
          cy.reload();
          EHoldingsProviderView.checkProxy(newProxy);
        });
      },
    );
    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });
  });
});
