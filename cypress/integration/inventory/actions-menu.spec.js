import TopMenu from '../../support/fragments/topMenu';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import inventoryActions from '../../support/fragments/inventory/inventoryActions';
import { Checkbox } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(inventoryActions.open());

    cy.expect(inventorySearch.getAllSearchResults().absent());
    inventoryActions.optionsIsDisabled([
      inventoryActions.options.saveUUIDs,
      inventoryActions.options.saveCQLQuery,
      inventoryActions.options.exportMARC,
      inventoryActions.options.showSelectedRecords
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      inventorySearch.searchByEffectiveLocation(),
      inventorySearch.getSearchResult().find(Checkbox()).click(),
      inventoryActions.open()
    ]);

    inventoryActions.optionsIsEnabled([
      inventoryActions.options.saveUUIDs,
      inventoryActions.options.saveCQLQuery,
      inventoryActions.options.exportMARC,
      inventoryActions.options.showSelectedRecords
    ]);
  });
});
