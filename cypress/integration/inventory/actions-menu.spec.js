import TopMenu from '../../support/fragments/topMenu';
import * as InventorySearch from '../../support/fragments/inventory/inventorySearch';
import * as Actions from '../../support/fragments/inventory/inventoryActions';
import { Checkbox } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(Actions.open());

    cy.expect(InventorySearch.getAllSearchResults().absent());

    Actions.optionsIsDisabled([
      Actions.options.saveUUIDs,
      Actions.options.saveCQLQuery,
      Actions.options.exportMARC,
      Actions.options.showSelectedRecords
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      InventorySearch.searchByEffectiveLocation(),
      InventorySearch.getSearchResult().find(Checkbox()).click(),
      Actions.open()
    ]);

    Actions.optionsIsEnabled([
      Actions.options.saveUUIDs,
      Actions.options.saveCQLQuery,
      Actions.options.exportMARC,
      Actions.options.showSelectedRecords
    ]);
  });
});
