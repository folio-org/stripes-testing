import { Button, Heading, HTML, TextInput, including } from '../../../../interactors';

// the fields are found by id, as the fields of the login page are in "cy.inputCredentialsAndLogin"
const newPasswordField = TextInput({ id: 'new-password' });
const confirmPasswordField = TextInput({ id: 'confirm-password' });
const setPasswordButton = Button('Set password');
const continueToFolioButton = Button('Continue to FOLIO');

export default {
  // The email is HTML: the href is not quoted and "=" and "&" are written as HTML entities
  getLinkFromEmailBody(emailBody, linkText) {
    const linkMatch = emailBody.match(new RegExp(`href=([^>\\s]+)>${linkText}</a>`));

    expect(linkMatch, `the link "${linkText}" is in the email`).to.not.be.null;

    return linkMatch[1].replace(/&#61;/g, '=').replace(/&amp;/g, '&');
  },

  // The link has the host from the tenant configuration, so only the path and the query are used
  // to open it on the host the tests run on
  openLinkFromEmail(link) {
    const { pathname, search } = new URL(link);

    cy.visit(`${pathname}${search}`);
  },

  waitLoadingChoosePassword() {
    cy.expect([
      Heading('Choose a password').exists(),
      HTML(including('New Password')).exists(),
      HTML(including('Confirm Password')).exists(),
      newPasswordField.has({ value: '' }),
      confirmPasswordField.has({ value: '' }),
      setPasswordButton.has({ disabled: true }),
    ]);
  },

  fillNewPassword(password) {
    cy.do([newPasswordField.fillIn(password), confirmPasswordField.fillIn(password)]);
  },

  clickSetPassword() {
    cy.expect(setPasswordButton.has({ disabled: false }));
    cy.do(setPasswordButton.click());
  },

  verifyPasswordChanged() {
    cy.expect([
      Heading('Congratulations!').exists(),
      HTML(including("You've successfully changed your password.")).exists(),
      continueToFolioButton.has({ disabled: false }),
    ]);
  },

  clickContinueToFolio() {
    cy.do(continueToFolioButton.click());
  },
};
