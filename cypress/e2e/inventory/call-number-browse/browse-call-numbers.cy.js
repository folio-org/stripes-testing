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
      'C347902 Verify Browse call numbers form (spitfire)',
      { tags: ['smoke', 'spitfire', 'C347902'] },
      () => {
        const callNumber = 'Holdings magazine Q1';
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.verifyActionButtonNotExistsInBrowseMode();
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyResetAllButtonDisabled();
        InventorySearchAndFilter.verifySearchButtonDisabled();

        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
        InventorySearchAndFilter.fillInBrowseSearch(callNumber);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber }],
        });
        InventorySearchAndFilter.validateSearchTableHeaders();
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
