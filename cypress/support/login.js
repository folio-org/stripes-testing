import localforage from 'localforage';

import { Button, Dropdown, TextField, Heading, including } from '../../interactors';

Cypress.Commands.add('login', (username, password, visitPath = { path: '/', waiter: () => cy.expect(Heading(including('Welcome')).exists()) }) => {
  // We use a behind-the-scenes method of ensuring we are logged
  // out, rather than using the UI, in accordance with the Best
  // Practices guidance at
  // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
  localforage.removeItem('okapiSess');

  cy.visit(visitPath.path);

  // Todo: find the way to wrap interactor to cy chainable object
  cy.do([
    TextField('Username').fillIn(username),
    TextField('Password').fillIn(password),
    Button('Log in').click()
  ]);

  // TODO: find the way how customize waiter timeout in case of interactors(cy.wrap may be)
  // https://stackoverflow.com/questions/57464806/set-timeout-for-cypress-expect-assertion
  // https://docs.cypress.io/api/commands/wrap#Requirements

  visitPath.waiter();

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

Cypress.Commands.add('loginAsAdmin', (visitPath) => {
  cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), visitPath);
});

// Created drag and drop custom command
Cypress.Commands.add('dragAndDrop', (subject, target) => {
  Cypress.log({
    name: 'DRAGNDROP',
    message: `Dragging element ${subject} to ${target}`,
    consoleProps: () => {
      return {
        subject,
        target
      };
    }
  });
  const BUTTON_INDEX = 0;
  const SLOPPY_CLICK_THRESHOLD = 10;
  cy.get(target)
    .first()
    .then($target => {
      const coordsDrop = $target[0].getBoundingClientRect();
      cy.get(subject)
        .first()
        .then(subject => {
          const coordsDrag = subject[0].getBoundingClientRect();
          cy.wrap(subject)
            .trigger('mousedown', {
              button: BUTTON_INDEX,
              clientX: coordsDrag.x,
              clientY: coordsDrag.y,
              force: true
            })
            .trigger('mousemove', {
              button: BUTTON_INDEX,
              clientX: coordsDrag.x + SLOPPY_CLICK_THRESHOLD,
              clientY: coordsDrag.y,
              force: true
            });
          cy.get('body')
            .trigger('mousemove', {
              button: BUTTON_INDEX,
              clientX: coordsDrop.x,
              clientY: coordsDrop.y,
              force: true
            })
            .trigger('mouseup');
        });
    });
});
