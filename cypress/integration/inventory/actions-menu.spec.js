import { Button } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/inventory');
  });

  it('verifies action menu options before any search is conducted trId: 196752', () => {
    cy.do(Button('Actions').click());

    cy.get('#dropdown-clickable-get-items-uiids')
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get('#dropdown-clickable-get-cql-query')
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get('#dropdown-clickable-export-marc')
      .invoke('prop', 'disabled')
      .should('eq', true);

    cy.get('#dropdown-clickable-show-selected-records')
      .invoke('prop', 'disabled')
      .should('eq', true);
  });
});
