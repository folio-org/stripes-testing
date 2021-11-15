import localforage from 'localforage';

import { Button, Dropdown, Heading, including, TextField } from '../../interactors';
import getLongDelay from './utils/cypressTools';

Cypress.Commands.add('login', (username, password) => {
  // We use a behind-the-scenes method of ensuring we are logged
  // out, rather than using the UI, in accordance with the Best
  // Practices guidance at
  // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
  localforage.removeItem('okapiSess');

  cy.visit('/');

  cy.expect(TextField('Username').exists(), getLongDelay());
  cy.do(TextField('Username').fillIn(username));
  cy.do(TextField('Password').fillIn(password));
  cy.do(Button('Log in').click());

  // TODO: find the way how customize waiter timeout in case of interactors(cy.wrap may be)
  // https://stackoverflow.com/questions/57464806/set-timeout-for-cypress-expect-assertion
  // https://docs.cypress.io/api/commands/wrap#Requirements

  // cy.expect(Heading(including('Welcome')).exists());
  cy.get('h1[class*=frontTitle]', getLongDelay());

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
