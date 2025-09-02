import { Permissions } from '../../../support/dictionary';
import EHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import EHoldingsProviderView from '../../../support/fragments/eholdings/eHoldingsProviderView';
import EHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import TopMenu from '../../../support/fragments/topMenu';

describe('eHoldings', () => {
  describe('Provider', () => {
    let userId;
    const specialProvider = 'Wiley';

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

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });
    it(
      'C423457 Cancel changes made in "Provider" record using "Cancel" button (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423457'] },
      () => {
        EHoldingsProvidersSearch.byProvider(specialProvider);
        EHoldingsProviders.viewProvider();
        EHoldingsProviderView.waitLoading();

        EHoldingsProviderView.edit();
        EHoldingsProviderEdit.waitLoading(specialProvider);

        EHoldingsProviderEdit.verifyButtonsDisabled();
        EHoldingsProviderEdit.changeProxy();
        EHoldingsProviderEdit.verifyButtonsEnabled();
        EHoldingsProviderEdit.cancelChanges();

        EHoldingsProviderEdit.verifyUnsavedChangesModalExists();
        EHoldingsProviderEdit.clickKeepEditing();

        EHoldingsProviderEdit.cancelChanges();

        EHoldingsProviderEdit.verifyUnsavedChangesModalExists();
        EHoldingsProviderEdit.clickContinueWithoutSaving();

        EHoldingsProviderView.waitLoading();
      },
    );
  });
});
