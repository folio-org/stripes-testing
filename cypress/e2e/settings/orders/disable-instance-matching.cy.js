import Permissions from '../../../support/dictionary/permissions';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Settings (Orders)', () => {
  describe('Instance matching', () => {
    let user;

    before(() => {
      cy.getAdminToken();
      InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
        if (settings?.length !== 0) {
          InventoryInteractions.setInstanceMatchingSetting({
            ...settings[0],
            value: JSON.stringify({ isInstanceMatchingDisabled: false }),
          });
        }
      });

      cy.createTempUser([Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
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
