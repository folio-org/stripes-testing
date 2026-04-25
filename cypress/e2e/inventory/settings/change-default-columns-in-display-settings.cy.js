import { APPLICATION_NAMES, INVENTORY_COLUMN_HEADERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Settings', () => {
    const instanceTitlePrefix = `AT_C813581_FolioInstance_${getRandomPostfix()}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 1,
      holdingsCount: 0,
    });
    const allColumnCheckboxes = Object.values(INVENTORY_COLUMN_HEADERS).slice(1);
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.resetInventoryDisplaySettingsViaAPI();

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.inventoryViewEditGeneralSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.resetInventoryDisplaySettingsViaAPI();
      InventoryInstance.deleteInstanceViaApi(folioInstances[0].instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C813581 Change user preferences of Inventory "Default columns" at the "Settings" >> "Inventory" >> "Display settings" pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C813581'] },
      () => {
        // Step 1: Go to Settings > Inventory > Display settings
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
        DisplaySettings.waitloading();

        // Step 2: Uncheck all checkboxes in "Default columns" section
        DisplaySettings.uncheckAllColumnCheckboxes();
        allColumnCheckboxes.forEach((columnName) => {
          DisplaySettings.verifyColumnCheckboxChecked(columnName, false);
        });

        // Step 3: Click Save
        DisplaySettings.clickSaveButton();
        DisplaySettings.checkAfterSaveSuccess();

        // Step 4: Go to Inventory app and run search
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventorySearchAndFilter.validateSearchTableColumnsShown(INVENTORY_COLUMN_HEADERS.TITLE);
        InventorySearchAndFilter.validateSearchTableColumnsShown(allColumnCheckboxes, false);

        // Step 5: Click Actions and check "Show columns" section
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(allColumnCheckboxes, false);

        // Step 6: Go back to Settings, check only "Contributors"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
        DisplaySettings.waitloading();
        allColumnCheckboxes.forEach((columnName) => {
          DisplaySettings.verifyColumnCheckboxChecked(columnName, false);
        });
        DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS);
        DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);

        // Step 7: Click Save
        DisplaySettings.clickSaveButton();
        DisplaySettings.checkAfterSaveSuccess();

        // Step 8: Go to Inventory app and run search
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventorySearchAndFilter.validateSearchTableColumnsShown([
          INVENTORY_COLUMN_HEADERS.TITLE,
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
        ]);
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          [
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            INVENTORY_COLUMN_HEADERS.DATE,
            INVENTORY_COLUMN_HEADERS.RELATION,
            INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
          ],
          false,
        );

        // Step 9: Click Actions and check "Show columns" section
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
          true,
        );
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(
          [
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            INVENTORY_COLUMN_HEADERS.DATE,
            INVENTORY_COLUMN_HEADERS.RELATION,
            INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
          ],
          false,
        );

        // Step 10: Go back to Settings, check all except Instance HRID
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
        DisplaySettings.waitloading();
        DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
        DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.PUBLISHERS);
        DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.DATE);
        DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.RELATION);
        [
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
          INVENTORY_COLUMN_HEADERS.PUBLISHERS,
          INVENTORY_COLUMN_HEADERS.DATE,
          INVENTORY_COLUMN_HEADERS.RELATION,
        ].forEach((columnName) => {
          DisplaySettings.verifyColumnCheckboxChecked(columnName, true);
        });
        DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.INSTANCE_HRID, false);

        // Step 11: Click Save
        DisplaySettings.clickSaveButton();
        DisplaySettings.checkAfterSaveSuccess();

        // Step 12: Go to Inventory app and run search
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventorySearchAndFilter.validateSearchTableColumnsShown([
          INVENTORY_COLUMN_HEADERS.TITLE,
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
          INVENTORY_COLUMN_HEADERS.PUBLISHERS,
          INVENTORY_COLUMN_HEADERS.DATE,
          INVENTORY_COLUMN_HEADERS.RELATION,
        ]);
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
          false,
        );

        // Step 13: Click Actions and check "Show columns" section
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(
          [
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            INVENTORY_COLUMN_HEADERS.DATE,
            INVENTORY_COLUMN_HEADERS.RELATION,
          ],
          true,
        );
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(
          INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
          false,
        );
      },
    );
  });
});
