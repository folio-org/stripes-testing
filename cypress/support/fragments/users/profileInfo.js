import { Button, Dropdown, HTML, including } from '../../../../interactors';

const profileDropdown = Dropdown({ id: 'profileDropdown' });
const logoutButton = Button('Log out');

export default {
  open() {
    cy.do(profileDropdown.open());
  },
  close() {
    cy.do(profileDropdown.close());
  },
  ensureOpen() {
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Log out")').length === 0) {
        this.open();
      }
    });
  },
  verifyLoggedInAs(firstName, lastName) {
    this.ensureOpen();
    cy.expect([
      profileDropdown.find(HTML(including('Logged in as'))).exists(),
      profileDropdown.find(HTML(including(firstName))).exists(),
      profileDropdown.find(HTML(including(lastName))).exists(),
    ]);
  },
  verifyLoggedInAsExact(firstName, lastName) {
    this.ensureOpen();
    cy.expect(
      profileDropdown.find(HTML(including(`Logged in as ${firstName} ${lastName}`))).exists(),
    );
  },
  verifyLogoutButtonPresent() {
    this.ensureOpen();
    cy.expect(profileDropdown.find(logoutButton).exists());
  },
  openAndVerify(firstName, lastName) {
    this.open();
    this.verifyLoggedInAs(firstName, lastName);
  },
};
