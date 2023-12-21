import { CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  const user = {};
  const searchOption = 'a';

  function resetAllAndCheckBrowseSearchInputFieldInFocus() {
    InventorySearchAndFilter.clickResetAllButton();
    InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
    InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
    InventorySearchAndFilter.verifyResetAllButtonDisabled(true);
    InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);
  }

  function searchBrowseSubjectAndCheckBrowseInventoryResultPaneInFocus() {
    InventorySearchAndFilter.browseSubjectsSearch(searchOption);
    InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
    InventorySearchAndFilter.checkBrowseInventoryResultPaneInFocus();
  }

  describe('Call Number Browse', () => {
    before('Creating user', () => {
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
      'C422098: Call number browse: verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
      { tags: ['extendedlPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        searchBrowseSubjectAndCheckBrowseInventoryResultPaneInFocus();
        InventorySearchAndFilter.clickEffectiveLocationAccordionToggleButton();
        InventorySearchAndFilter.clickEffectiveLocationAccordionInput();
        InventorySearchAndFilter.checkEffectiveLocationAccordionInputInFocus();
        resetAllAndCheckBrowseSearchInputFieldInFocus();
        Object.values(CALL_NUMBER_TYPE_NAMES).forEach((type) => {
          BrowseCallNumber.selectBrowseCallNumbersOption(type);
          searchBrowseSubjectAndCheckBrowseInventoryResultPaneInFocus();
          resetAllAndCheckBrowseSearchInputFieldInFocus();
        });
      },
    );
  });
});
