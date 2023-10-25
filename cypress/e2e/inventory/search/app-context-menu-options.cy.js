import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  let user;
  const defaultSearchOption = 'Keyword (title, contributor, identifier, HRID, UUID)';

  before('Create test data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C368489 Verify the new option added to the "App context menu" dropdown (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // #1 Select  the "Inventory" app
      // *  Opens "Inventory" main page with "Search & filter" left pane
      // * "Search" toggle is selected on "Search & filter" pane
      // * "Instance" toggle is selected on "Search & filter" pane
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();

      // #2 Click the "Inventory v" icon button, at the top-left of the page.
      // Inventory dropdown is expanded with the following options:
      // - "Inventory app search"
      // - "Keyboard shortcuts"
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.verifyInventoryDrowdownOptions();

      // #3 Click on "Keyboard shortcuts"
      // * Displays "Keyboard shortcuts" modal
      // * "Close" button is active
      InventoryKeyboardShortcuts.openShortcuts();
      InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
      InventoryKeyboardShortcuts.verifyCloseKeyboardShortcutsModalButtonIsActive();

      // #4 Click on the "Close" button on the  "Keyboard shortcuts" modal
      // * The "Keyboard shortcuts" closes
      // * "Inventory" landing page is shown
      InventoryKeyboardShortcuts.closeShortcuts();
      InventoryInstances.waitContentLoading();

      // #5 Click the "Inventory v" icon button, at the top-left of the page.
      // Inventory dropdown is expanded with the following options:
      // - "Inventory app search"
      // - "Keyboard shortcuts"
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.verifyInventoryDrowdownOptions();

      // #6 Select "Inventory app search" option
      // - Directs user to default Inventory search.
      // - Focus is on the "Keyword (title, contributor, identifier)" search box
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventoryInstances.waitContentLoading();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);

      // #7 Fill in the "Keyword (title, contributor, identifier)" search box any existing Instance to retrieve the result list/ For example: "*"
      // Entered value is displayed in the search field
      // "Search" button is active
      InventoryInstances.searchInstancesWithOption(defaultSearchOption, '*');

      // #8 Click "Search" button
      // A result list with instances is retrieved

      // #9 Click on any row to open the detail view of "Instance" record
      // The detail view of "Instance" record is open in the 3rd pane
      InventorySearchAndFilter.selectSearchResultItem();
      InventoryInstance.waitInventoryLoading();

      // #10 Click the "Inventory v" icon button => Select "Inventory app search" option
      // - Directs user to default Inventory search:
      // *"Search" toggle is selected on "Search & filter" pane
      // *"Instance" toggle is selected on "Search & filter" pane
      // - Focus is on the "Keyword (title, contributor, identifier)" search box
      // - The "Keyword (title, contributor, identifier)" search box is empty
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);

      // #11 Select "Holdings" toggle on the "Search & filter" left pane => Search for a Holdings record with "FOLIO" source by selecting "FOLIO" option at the "Source" accordion
      // Result list is populated with instances records associated with Holdings underlying "FOLIO" source
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.bySource('FOLIO');

      // #12 Open any Holdings record in detailed view mode by clicking on the row with Instance record and hitting "View holdings" button at the Holdings accordion
      // - A Holdings record is open in the view window
      // - The "Inventory" button at the top-left of the page is presented
      InventorySearchAndFilter.selectSearchResultItem();
      InventoryInstance.openHoldingView();
      InventoryKeyboardShortcuts.verifyInventoryDropdownExists();

      // #13 Click on the "Inventory" button at the top-left of the page => Select "Inventory app search" option
      // - Directs user to default Inventory search:
      // *"Search" toggle is selected on "Search & filter" pane
      // *"Instance" toggle is selected on "Search & filter" pane
      // - Focus is on the "Keyword (title, contributor, identifier)" search box
      // - The "Keyword (title, contributor, identifier)" search box is empty
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);

      // #14 Select "Browse" toggle on "Search & filter" pane => Select "Call numbers" option from "Select a browse option" dropdown on "Search & filter" pane
      // * "Call numbers" option is displayed in "Select a browse option" dropdown
      // * Search field is empty
      // * "Search" button is NOT active
      // * "Reset all" button is NOT active
      // * "Effective location (item)" accordion appears below the search field
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.verifySearchButtonDisabled();
      InventorySearchAndFilter.verifyResetAllButtonDisabled();

      // #15 Enter any existing call number in the search field, for example: "DE3"  => Click "Search" button
      // Search results appear in "Browse inventory" pane
      InventorySearchAndFilter.browseSearch('DE3');
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();

      // #16 Click on the "Inventory" button at the top-left of the page => Select "Inventory app search" option
      // - Directs user to default Inventory search:
      // *"Search" toggle is selected on "Search & filter" pane
      // *"Instance" toggle is selected on "Search & filter" pane
      // - Focus is on the "Keyword (title, contributor, identifier)" search box
      // - The "Keyword (title, contributor, identifier)" search box is empty
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);
    },
  );
});
