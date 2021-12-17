import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryModals from '../../support/fragments/inventory/inventoryModals';

describe('inventory: selecting records', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196755 verifies search result counts and selected counts', () => {
    const selectedRecords = 2;

    InventorySearch.byEffectiveLocation();
    InventorySearch.selectResultCheckboxes(selectedRecords);
    InventorySearch.verifySelectedRecords(selectedRecords);
  });

  it('C196754 verify show selected records', () => {
    const selectedRecords = 3;

    InventorySearch.byEffectiveLocation();
    InventorySearch.selectResultCheckboxes(selectedRecords);
    InventorySearch.showSelectedRecords();

    InventoryModals.verifySelectedRecords(selectedRecords);
    InventoryModals.verifySelectedRecordsCount(selectedRecords);
    InventoryModals.verifyButtons();
  });
});
