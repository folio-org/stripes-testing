import { Button, Dropdown, Heading, including, TextInput, HTML } from '../../../../interactors';

describe('Eureka', () => {
  describe('Login', () => {
    const usernameInput = TextInput('Username');
    const passwordInput = TextInput('Password');
    const loginButton = Button({ name: 'login' });
    const welcomeMessage = Heading(including('Welcome, the Future'));
    const appButton = HTML({ className: including('navRoot-') }).find(
      Button({ id: including('app-list-item-clickable-') }),
    );
    const userProfileButton = Dropdown({ id: 'profileDropdown' });
    const logoutButton = userProfileButton.find(Button('Log out'));

    before(() => {
      cy.logoutViaApi();
      cy.clearCookies({ domain: null });
    });

    it(
      'C436889 Logout with default parameters (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C436889'] },
      () => {
        cy.visit('/');
        cy.expect([
          usernameInput.has({ value: '' }),
          passwordInput.has({ value: '' }),
          loginButton.exists(),
        ]);
        cy.do([
          usernameInput.fillIn(Cypress.env('diku_login')),
          passwordInput.fillIn(Cypress.env('diku_password')),
          loginButton.click(),
        ]);
        cy.expect([welcomeMessage.exists(), appButton.exists()]);
        // wait until page fully loaded - if "Log out" clicked too fast, click might not register
        cy.wait(1000);
        cy.do([userProfileButton.open(), logoutButton.click()]);
        cy.expect([
          usernameInput.has({ value: '' }),
          passwordInput.has({ value: '' }),
          loginButton.exists(),
        ]);
      },
    );
  });
});
