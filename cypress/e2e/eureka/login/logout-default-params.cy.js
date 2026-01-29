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
    const logInAgainButton = Button({ text: 'Log in again' });
    const errorMessage = HTML({ text: 'Error: server is forbidden, unreachable, or unavailable.' });

    beforeEach(() => {
      cy.logoutViaApi();
      cy.clearCookies({ domain: null });
    });

    it(
      'C436889 Logout with default parameters (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C436889'] },
      () => {
        cy.visit('/');
        cy.selectTenantIfDropdown();

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
        cy.expect(logInAgainButton.exists());
        cy.do(logInAgainButton.click());
        cy.wait(3000);
        cy.selectTenantIfDropdown();

        cy.expect([
          usernameInput.has({ value: '' }),
          passwordInput.has({ value: '' }),
          loginButton.exists(),
        ]);
      },
    );

    it(
      'C630447 A page with error message is shown when logging in if Kong is unavailable (eureka)',
      { tags: ['extendedPath', 'eureka', 'C630447'] },
      () => {
        cy.intercept('GET', /.+authn\/token.+/, { forceNetworkError: true }).as('code');
        cy.visit('/');
        cy.selectTenantIfDropdown();

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

        cy.expect([logInAgainButton.exists(), errorMessage.exists()]);
      },
    );
  });
});
