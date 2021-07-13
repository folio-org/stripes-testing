import localforage from 'localforage';

import { Button, Dropdown, Heading, including, TextField } from '../../interactors';

Cypress.Commands.add('login', (username, password) => {
  // We use a behind-the-scenes method of ensuring we are logged
  // out, rather than using the UI, in accordance with the Best
  // Practices guidance at
  // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
  localforage.removeItem('okapiSess');

  cy.do([
    TextField('Username').fillIn(username),
    TextField('Password').fillIn(password),
    Button('Log in').click(),
  ]);

  cy.expect(Heading(including('Welcome')).exists());

  // There seems to be a race condition here: sometimes there is
  // re-render that happens so quickly that following actions like
  //       cy.get('#app-list-item-clickable-courses-module').click()
  // fail because the button becomes detached from the DOM after the
  // get() but before the click().
});

Cypress.Commands.add('logout', () => {
  cy.do([
    Dropdown('My profile').open(),
    Button('Log out').click(),
  ]);

  cy.expect(Button('Log in', { disabled: true }).exists());
});
