import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { MultiColumnList } from '../../../../interactors';
import { BROWSE_CLASSIFICATION_OPTIONS } from '../../../support/constants';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';

describe('fse-inventory - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195318,TC195689 - verify that inventory page is displayed, search works for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'inventory'] },
    () => {
      cy.intercept('GET', '/search/instances/facets?*').as('getFacets');
      cy.intercept('GET', '/search/instances?*').as('getInstances');
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
      // search by item status
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.byKeywords();
      // wait for requests
      cy.expect(MultiColumnList().exists());
      // reset filters
      InventorySearchAndFilter.resetAll();
      cy.expect(MultiColumnList().absent());
    },
  );

  it(
    `TC195766 - check inventory classifications ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['ramsons', 'fse', 'ui', 'inventory'] },
    () => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.switchToBrowseTab();
      // select Classification (all)
      InventorySearchAndFilter.selectBrowseOption(BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL);
      InventorySearchAndFilter.browseSearch('a');
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.checkClassificationAllResultsDisplayed();
    },
  );
});
