import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    let existingCallNumber;
    beforeEach('navigate to inventory', () => {
      cy.getAdminToken();
      BrowseCallNumber.getCallNumbersViaApi('all', 'DE4').then((callNumbers) => {
        existingCallNumber = callNumbers[0].fullCallNumber;

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    it(
      'C347902 Verify Browse call numbers form (spitfire)',
      { tags: ['smoke', 'spitfire', 'C347902'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.verifyActionButtonNotExistsInBrowseMode();
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyResetAllButtonDisabled();
        InventorySearchAndFilter.verifySearchButtonDisabled();

        InventorySearchAndFilter.verifyBrowseOptions();

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
        InventorySearchAndFilter.fillInBrowseSearch(existingCallNumber);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: existingCallNumber }],
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
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
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
