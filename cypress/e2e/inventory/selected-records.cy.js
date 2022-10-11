import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryModals from '../../support/fragments/inventory/inventoryModals';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: selecting / changing records', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196755 verifies search result counts and selected counts (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    const selectedRecords = 2;

    InventorySearch.byKeywords('*');
    InventorySearch.selectResultCheckboxes(selectedRecords);
    InventorySearch.verifySelectedRecords(selectedRecords);
  });

  it('C196754 verify show selected records (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    const selectedRecords = 3;

    InventorySearch.byKeywords('*');
    InventorySearch.selectResultCheckboxes(selectedRecords);
    InventorySearch.verifySelectedRecords(selectedRecords);
    InventorySearch.showSelectedRecords();

    InventoryModals.verifySelectedRecords(selectedRecords);
    InventoryModals.verifySelectedRecordsCount(selectedRecords);
    InventoryModals.verifyButtons();
  });

  it('C196756 verify selected records after changing selection (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    const selectedRecords = 3;
    const unselectedRecords = 1;

    InventorySearch.byKeywords('*');
    InventorySearch.selectResultCheckboxes(selectedRecords);
    InventorySearch.verifySelectedRecords(selectedRecords);
    InventorySearch.showSelectedRecords();

    InventoryModals.clickOnCheckboxes(unselectedRecords);
    InventoryModals.save();
    InventorySearch.verifySelectedRecords(selectedRecords - unselectedRecords);
  });
});
