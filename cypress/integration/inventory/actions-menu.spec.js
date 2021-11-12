import TopMenu from "../../support/fragments/topMenu";
import Actions from "../../support/fragments/inventory/actions";

describe('ui-inventory: actions', () => {
  beforeEach('navigates to Actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(Actions.openActions());

    cy.get(Actions.saveUUIDOption)
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get(Actions.saveCQLQueryOption)
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get(Actions.exportMARCOption)
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get(Actions.showSelectedRecordsOption)
      .invoke('prop', 'disabled')
      .should('eq', true);
  });
});
