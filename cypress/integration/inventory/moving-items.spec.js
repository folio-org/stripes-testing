import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import testTypes from '../../support/dictionary/testTypes';
import Helper from '../../support/fragments/finance/financeHelper';
import { calloutTypes } from '../../../interactors';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

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
    Helper.checkCalloutMessage(successCalloutMessage, calloutTypes.success);

    InventoryInstance.returnItemToFirstHolding(firstHolding, secondHolding);
    Helper.checkCalloutMessage(successCalloutMessage, calloutTypes.success);
  });
});
