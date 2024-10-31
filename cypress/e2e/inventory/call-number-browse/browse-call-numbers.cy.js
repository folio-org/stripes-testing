import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    beforeEach('navigate to inventory', () => {
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    it(
      'C347902 Verify "Browse call numbers" option on the Instances tab (firebird)',
      { tags: ['smoke', 'firebird', 'C347902'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
        InventoryActions.actionsIsAbsent();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
      },
    );

    it(
      'C347903 Verify "Browse call numbers" option on Holdings tab (firebird)',
      { tags: ['smoke', 'firebird', 'C347903'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.browseCallNumberIsAbsent();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
      },
    );

    it(
      'C347923 Verify "Browse call numbers" option on Item tab (firebird)',
      { tags: ['smoke', 'firebird', 'C347923'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.browseCallNumberIsAbsent();
      },
    );

    it(
      'C350377 Verify the "Browse subjects" search option on the Instances tab (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350377'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
        InventoryActions.actionsIsAbsent();
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.browseSubjectsSearch();
        cy.reload();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.filtersIsAbsent();
      },
    );

    it(
      'C350378 Verify the "Browse subjects" search option on the Holdings tab (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350378'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.browseSubjectIsAbsent();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
      },
    );

    it(
      'C350379 Verify the "Browse subjects" search option on the Item tab (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350379'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.browseSubjectIsAbsent();
      },
    );
  });
});
