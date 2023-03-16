import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';

describe('permissions: inventory', () => {
  beforeEach(() => {
    cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiCallNumberBrowse.gui
      ]).then(userProperties => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.inventoryPath, waiter: InventoryInstances.waitLoading });
      });
  });

  it('C375072 User with "Inventory: View instances, holdings, and items" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    InventorySearchAndFilter.switchToBrowseTab();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.showsOnlyEffectiveLocation();
  });
});
