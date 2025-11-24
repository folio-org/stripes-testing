import { INVENTORY_DEFAULT_SORT_OPTIONS, APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      let user;

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        cy.createTempUser([Permissions.inventoryViewEditGeneralSettings.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
          },
        );
      });

      after('Delete user', () => {
        cy.getAdminToken();
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        Users.deleteViaApi(user.userId);
      });

      it(
        'C543867 Change "Default sort" from "Settings" >> "Inventory" >> "Display settings" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C543867'] },
        () => {
          DisplaySettings.waitloading();
          DisplaySettings.verifyDefaultSortOptions();
          DisplaySettings.verifySelectedDefaultSortOption(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          Object.values(INVENTORY_DEFAULT_SORT_OPTIONS)
            .toReversed()
            .forEach((option) => {
              DisplaySettings.changeDefaultSortOption(option);
              DisplaySettings.checkAfterSaveSuccess();
              DisplaySettings.verifySelectedDefaultSortOption(option);
            });
        },
      );
    });
  });
});
