import TopMenu from '../../support/fragments/topMenu';
import { getAllSearchResults, searchByEffectiveLocation, getSearchResult } from '../../support/fragments/inventory/inventorySearch';
import { openActions, options, optionsIsDisabled, optionsIsEnabled } from '../../support/fragments/inventory/inventoryActions';
import { Checkbox } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(openActions());

    cy.expect(getAllSearchResults().absent());

    optionsIsDisabled([
      options.saveUUIDs,
      options.saveCQLQuery,
      options.exportMARC,
      options.showSelectedRecords
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      searchByEffectiveLocation(),
      getSearchResult().find(Checkbox()).click(),
      openActions()
    ]);

    optionsIsEnabled([
      options.saveUUIDs,
      options.saveCQLQuery,
      options.exportMARC,
      options.showSelectedRecords
    ]);
  });
});
