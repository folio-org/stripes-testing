import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import testTypes from '../../support/dictionary/testTypes';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';

const successCalloutMessage = '1 item has been successfully moved.';


describe('inventory: moving items', () => {
  beforeEach('navigates to Inventory', () => {
    // TODO: replace this user with all permissions to user with only needed permission for moving items
    cy.login('diku_admin', 'admin');
    cy.visit(TopMenu.inventoryPath);
  });

  it('C15185 Move multiple items from one holdings to another holdings within an instance', { tags: [testTypes.smoke] }, () => {
    const firstHolding = 'Main Library';
    const secondHolding = 'Annex';

    InventorySearch.byEffectiveLocation();
    InventorySearch.selectSearchResultItem();
    InventoryInstance.openMoveItemsWithinAnInstance();

    InventoryInstance.moveItemToAnotherHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);

    InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);
  });
});
