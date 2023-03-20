import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';

describe('permissions: inventory', () => {
    let userWithAllPermissions;
    let userWithOnlyViewPermissions;

  before(() => {
    cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
      ]).then(userProperties => {
        userWithAllPermissions = userProperties;
      });
    cy.createTempUser([
        permissions.inventoryAll.gui,
      ]).then(userProperties => {
        userWithOnlyViewPermissions = userProperties;
      });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(userWithAllPermissions.userId);
    Users.deleteViaApi(userWithOnlyViewPermissions.userId);
  });

  it('C375072 User with "Inventory: View instances, holdings, and items" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    cy.login(userWithAllPermissions.username, userWithAllPermissions.password);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.switchToBrowseTab();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.browseSearch('K1');
    InventorySearchAndFilter.verifyCallNumberBrowsePane();
    InventorySearchAndFilter.selectBrowseSubjects();
    InventorySearchAndFilter.browseSearch('art');
    InventorySearchAndFilter.verifyCallNumberBrowsePane();
  });

  it('C375077 User with "Inventory: All permissions" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    cy.login(userWithOnlyViewPermissions.username, userWithOnlyViewPermissions.password);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.switchToBrowseTab();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.browseSearch('K1');
    InventorySearchAndFilter.verifyCallNumberBrowsePane();
    InventorySearchAndFilter.selectBrowseSubjects();
    InventorySearchAndFilter.browseSearch('art');
    InventorySearchAndFilter.verifyCallNumberBrowsePane();
  });
});
