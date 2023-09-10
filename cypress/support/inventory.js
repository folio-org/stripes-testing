import { Button, Checkbox, TextField } from '../../interactors';

Cypress.Commands.add('searchMARC', (name) => {
  cy.do([
    // NOTE: aria-label has trailing space
    TextField('Search ').fillIn(name),
    Button('Source').click(),
    Checkbox('MARC').click(),
  ]);
});
