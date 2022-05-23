import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import { Checkbox } from '../../../interactors';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    InventoryActions.open();

    cy.expect(InventorySearch.getAllSearchResults().absent());
    InventoryActions.optionsIsDisabled([
      InventoryActions.options.saveUUIDs,
      InventoryActions.options.saveCQLQuery,
      InventoryActions.options.exportMARC,
      InventoryActions.options.showSelectedRecords
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.do([
      InventorySearch.byEffectiveLocation(),
      InventorySearch.getSearchResult().find(Checkbox()).click(),
      InventoryActions.open()
    ]);

    InventoryActions.optionsIsEnabled([
      InventoryActions.options.saveUUIDs,
      InventoryActions.options.saveCQLQuery,
      InventoryActions.options.exportMARC,
      InventoryActions.options.showSelectedRecords
    ]);
  });
});
