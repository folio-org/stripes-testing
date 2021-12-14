import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/InventoryInstances';
import { Checkbox } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(InventoryInstances.open());

    cy.expect(InventorySearch.getAllSearchResults().absent());
    InventoryInstances.optionsIsDisabled([
      InventoryInstances.options.saveUUIDs,
      InventoryInstances.options.saveCQLQuery,
      InventoryInstances.options.exportMARC,
      InventoryInstances.options.showSelectedRecords
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      InventorySearch.byEffectiveLocation(),
      InventorySearch.getSearchResult().find(Checkbox()).click(),
      InventoryInstances.open()
    ]);

    InventoryInstances.optionsIsEnabled([
      InventoryInstances.options.saveUUIDs,
      InventoryInstances.options.saveCQLQuery,
      InventoryInstances.options.exportMARC,
      InventoryInstances.options.showSelectedRecords
    ]);
  });
});
