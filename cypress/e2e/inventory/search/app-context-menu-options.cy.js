import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const defaultSearchOption = 'Keyword (title, contributor, identifier, HRID, UUID)';
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Inventory', () => {
  before('Create test data', () => {
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  });

  it(
    'C368489 Verify the new option added to the "App context menu" dropdown (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.verifyInventoryDrowdownOptions();
      InventoryKeyboardShortcuts.openShortcuts();
      InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
      InventoryKeyboardShortcuts.verifyCloseKeyboardShortcutsModalButtonIsActive();
      InventoryKeyboardShortcuts.closeShortcuts();
      InventoryInstances.waitContentLoading();
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.verifyInventoryDrowdownOptions();
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventoryInstances.waitContentLoading();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);
      InventoryInstances.searchInstancesWithOption(defaultSearchOption, '*');
      InventorySearchAndFilter.selectSearchResultItem();
      InventoryInstance.waitInventoryLoading();
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.byKeywords(item.instanceName);
      InventorySearchAndFilter.bySource('FOLIO');
      InventorySearchAndFilter.selectSearchResultItem();
      InventoryInstance.openHoldingView();
      InventoryKeyboardShortcuts.verifyInventoryDropdownExists();
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.verifySearchButtonDisabled();
      InventorySearchAndFilter.verifyResetAllButtonDisabled(true);
      InventorySearchAndFilter.browseSearch('DE3');
      InventorySearchAndFilter.verifyBrowseInventorySearchResults();
      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.openInventoryAppSearch();
      InventorySearchAndFilter.verifySearchToggleButtonSelected();
      InventorySearchAndFilter.instanceTabIsDefault();
      InventoryInstances.verifySelectedSearchOption(defaultSearchOption);
    },
  );
});
