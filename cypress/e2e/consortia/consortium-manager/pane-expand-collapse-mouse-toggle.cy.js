import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManagerApp from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.consortiaSettingsConsortiumManagerView.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.consortiumManagerPath,
          waiter: ConsortiumManagerApp.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1464337 - Toggling a pane with the mouse works as before — no regression in ECS and non-ECS apps (keyboard focus fix)',
      { tags: ['criticalPathECS', 'helios', 'C1464337'] },
      () => {
        // Precondition: "Consortium manager" is open on the central tenant
        ConsortiumManagerApp.verifyManagementPaneExpanded();

        // Step 1: Click "Collapse pane" with the mouse; the pane collapses,
        // focus stays on the pane toggle button
        ConsortiumManagerApp.clickManagementPaneToggleButton();
        ConsortiumManagerApp.verifyManagementPaneCollapsed();
        ConsortiumManagerApp.verifyManagementPaneToggleButtonFocused();

        // Step 2: Click "Expand pane" with the mouse; the pane expands
        ConsortiumManagerApp.clickManagementPaneToggleButton();
        ConsortiumManagerApp.verifyManagementPaneExpanded();
        ConsortiumManagerApp.verifyManagementPaneToggleButtonFocused();

        // Steps 3-4 are checked in "Inventory" on the same ECS central tenant instead of a non-ECS environment
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.verifySearchPaneExpanded();

        // Step 3: Click "Collapse pane" with the mouse; the pane collapses,
        // focus moves to the "Expand pane" button that replaces it
        InventorySearchAndFilter.clickCollapseSearchPaneButton();
        InventorySearchAndFilter.verifySearchPaneCollapsed();
        InventorySearchAndFilter.verifyExpandSearchPaneButtonFocused();

        // Step 4: Click "Expand pane" with the mouse; the pane expands
        InventorySearchAndFilter.clickExpandSearchPaneButton();
        InventorySearchAndFilter.verifySearchPaneExpanded();
        InventorySearchAndFilter.verifyCollapseSearchPaneButtonFocused();
      },
    );
  });
});
