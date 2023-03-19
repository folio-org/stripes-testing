import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';

describe('permissions: inventory', () => {
    let user;

  beforeEach(() => {
    cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
      ]).then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
  });

  afterEach('Deleting data', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C375072 User with "Inventory: View instances, holdings, and items" permission can see browse call numbers and subjects without assigning specific browse permissions (Orchid+) (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
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
