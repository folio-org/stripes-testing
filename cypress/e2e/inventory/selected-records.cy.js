import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryModals from '../../support/fragments/inventory/inventoryModals';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: selecting / changing records', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it(
    'C196755 Selecting records for quick export (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      const selectedRecords = 2;

      InventorySearchAndFilter.byKeywords('*');
      InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
      InventorySearchAndFilter.verifySelectedRecords(selectedRecords);
    },
  );

  it(
    'C196754 Show selected records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      const selectedRecords = 3;

      InventorySearchAndFilter.byKeywords('*');
      InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
      InventorySearchAndFilter.verifySelectedRecords(selectedRecords);
      InventorySearchAndFilter.showSelectedRecords();

      InventoryModals.verifySelectedRecords(selectedRecords);
      InventoryModals.verifySelectedRecordsCount(selectedRecords);
      InventoryModals.verifyButtons();
    },
  );

  it(
    'C196756 Change selected records (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      const selectedRecords = 3;
      const unselectedRecords = 1;

      InventorySearchAndFilter.byKeywords('*');
      InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
      InventorySearchAndFilter.verifySelectedRecords(selectedRecords);
      InventorySearchAndFilter.showSelectedRecords();

      InventoryModals.clickOnCheckboxes(unselectedRecords);
      InventoryModals.save();
      InventorySearchAndFilter.verifySelectedRecords(selectedRecords - unselectedRecords);
    },
  );
});
