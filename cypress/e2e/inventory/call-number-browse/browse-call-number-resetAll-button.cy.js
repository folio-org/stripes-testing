import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  const user = {};
  const searchOption = 'a';

  function searchBrowseRecordAndCheckBrowseInventoryResultPaneInFocus() {
    InventorySearchAndFilter.browseSubjectsSearch(searchOption);
    InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
    InventorySearchAndFilter.checkBrowseInventoryResultPaneInFocus(true);
  }

  function resetAllAndCheckBrowseSearchInputFieldInFocus() {
    InventorySearchAndFilter.clickResetAllButton();
    InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
    InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
    InventorySearchAndFilter.verifyResetAllButtonDisabled(true);
    InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);
  }

  describe('Call Number Browse', () => {
    before('Creating user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
    });

    it(
      'C422098 Call number browse: verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422098', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        searchBrowseRecordAndCheckBrowseInventoryResultPaneInFocus();
        InventorySearchAndFilter.clickEffectiveLocationAccordionToggleButton();
        InventorySearchAndFilter.clickEffectiveLocationAccordionInput();
        resetAllAndCheckBrowseSearchInputFieldInFocus();

        Object.values(BROWSE_CALL_NUMBER_OPTIONS).forEach((type) => {
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(type);
          InventorySearchAndFilter.checkBrowseOptionSelected(type);
          searchBrowseRecordAndCheckBrowseInventoryResultPaneInFocus();
          resetAllAndCheckBrowseSearchInputFieldInFocus();
        });
      },
    );
  });
});
