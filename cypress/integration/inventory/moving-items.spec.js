import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import testTypes from '../../support/dictionary/testTypes';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('inventory: moving items', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C15185 verifies moving multiple items between holding', { tags: [testTypes.smoke] }, () => {
    InventorySearch.byEffectiveLocation();
    cy.do(InventorySearch.getSearchResult().click());
    InventoryInstance.openMoveItemsWithinAnInstance();

    InventoryInstance.moveItemToAnotherHolding();
    InventoryInstance.verifySuccessCalloutMovingMessage(1);

    InventoryInstance.returnItemToFirstHolding();
    InventoryInstance.verifySuccessCalloutMovingMessage(1);
  });
});
