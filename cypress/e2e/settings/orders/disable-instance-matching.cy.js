import permissions from '../../../support/dictionary/permissions';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';

describe('Settings (Orders)', () => {
  describe('Instance matching', () => {
    let user;

    before(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Instance matching');
      SettingsOrders.uncheckDisableInstanceMatchingIfChecked();
      cy.wait(4000);

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsOrdersPath,
            waiter: SettingsOrders.waitLoadingOrderSettings,
          });
        },
      );
    });

    after(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Instance matching');
      SettingsOrders.uncheckDisableInstanceMatchingIfChecked();

      Users.deleteViaApi(user.userId);
    });

    it(
      'C499700 Make "Disable instance matching" option active in order settings (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C499700'] },
      () => {
        SettingsOrders.selectContentInGeneralOrders('Instance matching');
        SettingsOrders.verifyInstanceMatchingDescription();
        SettingsOrders.switchDisableInstanceMatching();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
        SettingsOrders.checkSaveButtonIsDisabled(true);
        SettingsOrders.selectContentInGeneralOrders('Approvals');
        SettingsOrders.selectContentInGeneralOrders('Instance matching');
        SettingsOrders.verifyCheckboxIsSelected('isInstanceMatchingDisabled', true);
        SettingsOrders.checkSaveButtonIsDisabled(true);
      },
    );
  });
});
