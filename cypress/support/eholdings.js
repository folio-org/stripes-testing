import {
  Button,
} from '../../interactors';

Cypress.Commands.add('search', (name) => {
  cy.get('#eholdings-search').type(name);
  cy.do(Button('Search').click());
  cy.get('#search-form').submit();
});
