import localforage from 'localforage';

Cypress.Commands.add('login', (username, password) => {
  // We use a behind-the-scenes method of ensuring we are logged
  // out, rather than using the UI, in accordance with the Best
  // Practices guidance at
  // https://docs.cypress.io/guides/references/best-practices.html#Organizing-Tests-Logging-In-Controlling-State
  localforage.removeItem('okapiSess');

  // But it's not feasible to log in to Stipes using a similar
  // behind-the-scenes approach, so we have to use the UI.
  cy.visit('');
  cy.contains('Log in');

  cy.findByRole('textbox', { name: /username/i }).type(username);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole('button', { name: /log in/i }).click();

  // Login can be too slow for the default 4-second timeout
  cy.contains('Welcome', { timeout: 10000 });

  // There seems to be a race condition here: sometimes there is
  // re-render that happens so quickly that following actions like
  //       cy.get('#app-list-item-clickable-courses-module').click()
  // fail because the button becomes detached from the DOM after the
  // get() but before the click().
});

Cypress.Commands.add('logout', () => {
  cy.findByRole('button', { name: /my profile/i }).click();
  cy.findByRole('button', { name: /log out/i }).click();
});
