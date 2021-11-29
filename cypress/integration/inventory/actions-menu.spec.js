import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(InventoryActions.open());

    cy.expect(InventorySearch.getSearchResults().absent());

    InventoryActions.optionsIsDisabled([
      InventoryActions.saveUUIDsOption(),
      InventoryActions.saveCQLQueryOption(),
      InventoryActions.exportMARCOption(),
      InventoryActions.showSelectedRecordsOption()
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      InventorySearch.byEffectiveLocation(),
      InventorySearch.getFirstResultCheckbox().click(),
      InventoryActions.open()
    ]);

    InventoryActions.optionsIsEnabled([
      InventoryActions.saveUUIDsOption(),
      InventoryActions.saveCQLQueryOption(),
      InventoryActions.exportMARCOption(),
      InventoryActions.showSelectedRecordsOption()
    ]);
  });
});
