import {
  INVENTORY_DEFAULT_SORT_OPTIONS,
  APPLICATION_NAMES,
  INVENTORY_COLUMN_HEADERS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

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

  describe('Date type', () => {
    let user;

    before('Create user, login', () => {
      cy.createTempUser([Permissions.inventoryViewEditGeneralSettings.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.resetInventoryDisplaySettingsViaAPI();

          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
      Users.deleteViaApi(user.userId);
    });

    it(
      'C813579 View "Settings" >> "Inventory" >> "Display settings" pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C813579'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.validateSettingsTab({
          name: INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS,
          isPresent: true,
        });

        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
        DisplaySettings.waitloading();
        DisplaySettings.verifySelectedDefaultSortOption(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);

        Object.values(INVENTORY_COLUMN_HEADERS)
          .slice(1)
          .forEach((columnName) => {
            DisplaySettings.verifyColumnCheckboxChecked(columnName);
          });
      },
    );
  });
});
