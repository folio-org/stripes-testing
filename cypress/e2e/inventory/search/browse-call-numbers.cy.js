import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('ui-inventory: browse call numbers', () => {
  beforeEach('navigate to inventory', () => {
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  it(
    'C347902 Verify "Browse call numbers" option on the Instances tab (firebird)',
    { tags: ['smoke', 'firebird'] },
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
    { tags: ['smoke', 'firebird'] },
    () => {
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.browseCallNumberIsAbsent();
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
    },
  );

  it(
    'C347923 Verify "Browse call numbers" option on Item tab (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      InventorySearchAndFilter.instanceTabIsDefault();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.browseCallNumberIsAbsent();
    },
  );

  it(
    'C350377 Verify the "Browse subjects" search option on the Instances tab (spitfire)',
    { tags: ['smoke', 'spitfire'] },
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
    { tags: ['smoke', 'spitfire'] },
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
    { tags: ['smoke', 'spitfire'] },
    () => {
      InventorySearchAndFilter.instanceTabIsDefault();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.browseSubjectIsAbsent();
    },
  );
});
