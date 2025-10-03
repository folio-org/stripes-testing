import localforage from 'localforage';

import { Button, Dropdown, TextField, Heading, including } from '../../interactors';

Cypress.Commands.add(
  'login',
  (
    username,
    password,
    visitPath = { path: '/', waiter: () => cy.expect(Heading(including('Welcome')).exists()) },
  ) => {
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
      Button('Log in').click(),
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
  },
);

Cypress.Commands.add('logout', () => {
  cy.do([Dropdown({ id: 'profileDropdown' }).open(), Button(including('Log out')).click()]);

  cy.expect(Button('Log in again').exists());
});

Cypress.Commands.add('loginAsAdmin', (visitPath) => {
  cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), visitPath);
});

Cypress.Commands.add('loginAsCollegeAdmin', (visitPath) => {
  cy.login('ECS0001Admin', Cypress.env('diku_password'), visitPath);
});

Cypress.Commands.add('loginAsUniversityAdmin', (visitPath) => {
  cy.login('ECS0005Admin', Cypress.env('diku_password'), visitPath);
});

Cypress.Commands.add('loginAsConsortiumAdmin', (visitPath) => {
  cy.login('consortium_admin', Cypress.env('diku_password'), visitPath);
});

Cypress.Commands.add(
  'checkSsoButton',
  (visitPath = { path: '/', waiter: () => cy.expect(Heading(including('Welcome')).exists()) }) => {
    // We use a behind-the-scenes method of ensuring we are logged
    // out, rather than using the UI, in accordance with the Best
    // Practices guidance at
    // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
    localforage.removeItem('okapiSess');

    cy.visit(visitPath.path);

    // Verify that SSO button displayed
    cy.expect([Button('Log in via SSO').exists()]);
  },
);
