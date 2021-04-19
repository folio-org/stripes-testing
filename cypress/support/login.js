import { TextField } from 'bigtest';

import { Button, Dropdown } from '../../interactors';

Cypress.Commands.add('login', (username, password) => {
  cy.do([
    TextField('Username').fillIn(username),
    TextField('Password').fillIn(password),
    Button('Log in').click(),
  ]);
});

Cypress.Commands.add('logout', () => {
  cy.do([
    Dropdown(Cypress.env('defaultServicePoint').name).open(),
    Button('Log out').click(),
  ]);
});
