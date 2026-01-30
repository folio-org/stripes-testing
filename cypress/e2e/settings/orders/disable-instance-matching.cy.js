import permissions from '../../../support/dictionary/permissions';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Settings (Orders)', () => {
  describe('Instance matching', () => {
    let user;

    before(() => {
      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
        },
      );
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Instance matching');
      SettingsOrders.uncheckDisableInstanceMatchingIfChecked();
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Instance matching');
      SettingsOrders.uncheckDisableInstanceMatchingIfChecked();
    });

    it(
      'C499700 Make "Disable instance matching" option active in order settings (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C499700'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: SettingsOrders.waitLoadingOrderSettings,
        });
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
