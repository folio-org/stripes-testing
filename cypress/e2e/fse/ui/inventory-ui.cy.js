import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { MultiColumnList, MultiColumnListHeader } from '../../../../interactors';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import Modals from '../../../support/fragments/modals';

describe('fse-inventory - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195318,TC195689 - verify that inventory page is displayed, search works for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'ui', 'inventory', 'TC195318', 'TC195689'] },
    () => {
      cy.intercept('GET', '/search/instances/facets?*').as('getFacets');
      cy.intercept('GET', '/search/instances?*').as('getInstances');
      // search by item status
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.byKeywords();
      // wait for requests
      cy.expect(MultiColumnList().exists());
      cy.get('div[class*="mclScrollable-"]').scrollTo('right', { ensureScrollable: false });
      cy.expect(MultiColumnListHeader('Instance HRID').exists());
      // reset filters
      InventorySearchAndFilter.resetAll();
      cy.expect(MultiColumnList().absent());
    },
  );

  it(
    `TC195766 - check inventory classifications ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'inventory', 'sanity', 'TC195766'] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      // check classification
      InventorySearchAndFilter.selectBrowseOption(BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL);
      InventorySearchAndFilter.browseSearch('test');
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.checkClassificationAllResultsDisplayed();
      // check call number
      InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE);
      InventorySearchAndFilter.browseSearch('a');
      BrowseCallNumber.checkSearchResultsTable();
      // check contributors
      InventorySearchAndFilter.selectBrowseOption('Contributors');
      InventorySearchAndFilter.browseSearch('check');
      BrowseContributors.checkSearchResultsTable();
      // check subjects
      InventorySearchAndFilter.selectBrowseOption('Subjects');
      InventorySearchAndFilter.browseSearch('test subject');
      BrowseSubjects.checkSearchResultsTable();
    },
  );

  it(
    `FDOPS-6193 - verify title and contributors columns in classification (all) browse results ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'inventory', 'sanity', 'FDOPS-6193'] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.selectBrowseOption(BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL);
      InventorySearchAndFilter.browseSearch('a');
      BrowseClassifications.verifySearchResultsTable();
    },
  );
});
