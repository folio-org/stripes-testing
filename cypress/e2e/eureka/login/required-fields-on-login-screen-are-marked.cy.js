import { Button, TextInput } from '../../../../interactors';

describe('Eureka', () => {
  describe('Login', () => {
    const usernameInput = TextInput('Username *');
    const passwordInput = TextInput('Password *');
    const loginButton = Button({ name: 'login' });

    before(() => {
      cy.logoutViaApi();
      cy.clearCookies({ domain: null });
    });

    it(
      'C1563889 Required fields on Login screen are marked with "*" (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1563889'] },
      () => {
        // Step 1: Open URL and wait for login page; verify Username and Password are marked with *
        cy.visit('/');
        cy.selectTenantIfDropdown();
        cy.verifyDefaultEurekaLoginPage();

        cy.expect([usernameInput.exists(), passwordInput.exists(), loginButton.exists()]);
      },
    );
  });
});
