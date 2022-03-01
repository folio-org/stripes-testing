import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';

describe('verify call number browse feature', () => {
  beforeEach('navigate to inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C347902 Verify "Browse call numbers" option on the Instances tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseCallNumbers();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.showsOnlyEffectiveLocation();
  });

  it('C347903 Verify "Browse call numbers" option on Holdings tab', { tags: [TestTypes.smoke] }, () => {
    InventorySearch.switchToHoldings();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.browseCallNumberIsAbsent();
  });
});
