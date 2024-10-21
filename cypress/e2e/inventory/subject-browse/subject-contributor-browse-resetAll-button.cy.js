import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const user = {};
    const browseOption = ['Contributors', 'Subjects'];

    before('Creating user', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
      InventorySearchAndFilter.switchToBrowseTab();
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
    });

    it(
      'C422099: Subject/Contributor browse: verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422099'] },
      () => {
        browseOption.forEach((option) => {
          InventorySearchAndFilter.selectBrowseOption(option);
          InventorySearchAndFilter.checkBrowseOptionSelected(option);
          InventorySearchAndFilter.browseSubjectsSearch('a');
          InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
          InventorySearchAndFilter.verifyResetAllButtonDisabled(true);
          InventorySearchAndFilter.checkBrowseSearchInputFieldInFocus(true);
        });
      },
    );
  });
});
