import { Permissions } from '../../../support/dictionary';
import EHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import EHoldingsProviderView from '../../../support/fragments/eholdings/eHoldingsProviderView';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import {
  EHoldingsProviders,
  EHoldingsProvidersSearch,
  EHoldingsSearch,
} from '../../../support/fragments/eholdings';

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
          waiter: EHoldingsSearch.waitLoading,
          authRefresh: true,
        });
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
