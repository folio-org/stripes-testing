import TopMenu from '../../../support/fragments/topMenu';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import Users from '../../../support/fragments/users/users';
import AppContextDropdown from '../../../support/fragments/appContextDropdown';
import { INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS } from '../../../support/constants';

let userId;
const hotKeys = InventoryHotkeys.hotKeys;

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    beforeEach('navigate to inventory', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    afterEach('Delete all data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C456114 View "Keyboard shortcut" pop-up modal window in "Inventory" app (Windows) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C456114'] },
      () => {
        InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        [
          INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS.SEARCH,
          INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS.SHORTCUTS,
        ].forEach((option) => {
          AppContextDropdown.checkOptionInAppContextDropdownMenu(option);
        });

        AppContextDropdown.clickOptionInAppContextDropdownMenu(
          INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS.SHORTCUTS,
        );
        AppContextDropdown.checkAppContextDropdownMenuShown(false);
        AppContextDropdown.verifyKeyboardShortcutsModalShown();
        InventoryKeyboardShortcuts.verifyShortcutsModalContent();

        InventoryKeyboardShortcuts.closeShortcutsViaIcon();
        AppContextDropdown.verifyKeyboardShortcutsModalShown(false);

        InventoryKeyboardShortcuts.pressHotKey(hotKeys.openShortcutsModal);
        AppContextDropdown.checkAppContextDropdownMenuShown(false);
        AppContextDropdown.verifyKeyboardShortcutsModalShown();
        InventoryKeyboardShortcuts.verifyShortcutsModalContent();
      },
    );
  });
});
