import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { MultiColumnList } from '../../../../interactors';

describe('fse-inventory - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195318 - verify that inventory page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'inventory'] },
    () => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
    },
  );

  it(
    `TC195689 - check inventory item search by status ${Cypress.env('OKAPI_HOST')}`,
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
});
