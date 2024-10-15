import InventoryModals from '../../../support/fragments/inventory/inventoryModals';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Data Export', () => {
  describe('Search in Inventory', () => {
    beforeEach('navigates to Inventory', () => {
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
    });

    it(
      'C196755 Selecting records for quick export (firebird)',
      { tags: ['smoke', 'firebird', 'C196755'] },
      () => {
        const selectedRecords = 2;

        InventorySearchAndFilter.byKeywords('*');
        InventorySearchAndFilter.selectResultCheckboxes(selectedRecords);
        InventorySearchAndFilter.verifySelectedRecords(selectedRecords);
      },
    );

    it(
      'C196754 Show selected records (firebird)',
      { tags: ['smoke', 'firebird', 'C196754'] },
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
      { tags: ['smoke', 'firebird', 'C196756'] },
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
});
