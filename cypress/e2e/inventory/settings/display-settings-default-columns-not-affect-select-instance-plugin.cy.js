import { APPLICATION_NAMES, INVENTORY_COLUMN_HEADERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import SelectInstanceModal, {
  COLUMN_HEADERS,
} from '../../../support/fragments/orders/modals/selectInstanceModal';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Settings', () => {
    const instanceTitlePrefix = `AT_C813586_FolioInstance_${getRandomPostfix()}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 1,
      holdingsCount: 0,
    });
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.resetInventoryDisplaySettingsViaAPI();

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
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
      'C813586 Change user preferences of Inventory "Default columns" at the "Settings" >> "Inventory" >> "Display settings" pane and verify tha plugin Select instance is not affected (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C813586'] },
      () => {
        // Step 1: Go to Settings > Inventory > Display settings
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
        DisplaySettings.waitloading();

        // Step 2: Uncheck "Contributors" checkbox in "Default columns" section
        DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS);
        DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, false);

        // Step 3: Click Save
        DisplaySettings.clickSaveButton();
        DisplaySettings.checkAfterSaveSuccess();

        // Step 4: Go to Inventory app, open instance, edit it, and open "Select instance" plugin
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventoryInstances.selectInstanceByTitle(instanceTitlePrefix);
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.openAddChildInstanceModal();

        // Step 5: Run search in the plugin and verify all default columns are displayed
        SelectInstanceModal.searchByName(instanceTitlePrefix);
        SelectInstanceModal.validateSearchTableColumnsShown(COLUMN_HEADERS);
      },
    );
  });
});
