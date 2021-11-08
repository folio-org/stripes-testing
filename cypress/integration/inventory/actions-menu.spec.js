import { Button, MultiSelect, Checkbox } from '../../../interactors';

describe('ui-inventory: actions menu', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/inventory');
  });

  it('verifies the action menu options after searching and selecting result', () => {
    cy.do([
      MultiSelect({ 'id': 'multiselect-6' }).select(['Main Library']),
      Checkbox({ 'id': 'checkbox-154' }).click(),
      Button('Actions').click()
    ]);

    cy.get('#dropdown-clickable-get-items-uiids')
      .invoke('prop', 'disabled')
      .should('eq', false);

    cy.get('#dropdown-clickable-get-cql-query')
      .invoke('prop', 'disabled')
      .should('eq', false);

    cy.get('#dropdown-clickable-export-marc')
      .invoke('prop', 'disabled')
      .should('eq', false);

    cy.get('#dropdown-clickable-show-selected-records')
      .invoke('prop', 'disabled')
      .should('eq', false);
  });
});
