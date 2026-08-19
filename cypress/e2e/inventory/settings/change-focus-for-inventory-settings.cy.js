import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSettingsInventoryViewList.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350397 Change focus for Inventory settings (promin)',
      { tags: ['extendedPathFlaky', 'promin', 'C350397'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.checkSettingsNavPaneFocused();

        SettingsInventory.goToSettingsInventory();
        SettingsInventory.waitLoading();
        SettingsInventory.checkInventoryNavPaneFocused();
      },
    );
  });
});
