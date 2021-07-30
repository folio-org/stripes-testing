import { Button, TextField } from '../../interactors';

Cypress.Commands.add('search', (name) => {
  cy.do([
    TextField('Enter your search').fillIn(name),
    Button('Search').click(),
  ]);
});
