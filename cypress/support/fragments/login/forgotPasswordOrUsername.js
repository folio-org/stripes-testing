import { Button, Heading, HTML, TextField, TextInput, including } from '../../../../interactors';

// found by id, as the fields of the login page are in "cy.inputCredentialsAndLogin"
const usernameEmailOrPhoneField = TextInput({ id: 'input-email-or-phone' });
const continueButton = Button('Continue');

// "Check your email" page shows the address with all the characters hidden except the first two
// of the local part and the first one of the domain name; the top-level domain is hidden fully:
// at_c1574453_abc@example.com -> at***************@e******.***
const hideEmailPartially = (email) => {
  const [localPart, domain] = email.split('@');
  const [domainName, ...topLevelDomains] = domain.split('.');
  const hiddenLocalPart = `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 2)}`;
  const hiddenDomainName = `${domainName.slice(0, 1)}${'*'.repeat(domainName.length - 1)}`;
  const hiddenTopLevelDomains = topLevelDomains.map((part) => '*'.repeat(part.length));

  return `${hiddenLocalPart}@${[hiddenDomainName, ...hiddenTopLevelDomains].join('.')}`;
};

export default {
  hideEmailPartially,

  waitLoadingForgotPassword: () => {
    cy.expect([
      HTML(including('Forgot password?')).exists(),
      TextField({ label: 'Enter username, email or phone' }).exists(),
      TextField({ placeholder: 'Enter username, email or phone' }).exists(),
    ]);
  },

  waitLoadingForgotUsername: () => {
    cy.expect([
      HTML(including('Forgot username?')).exists(),
      TextField({ label: 'Enter email or phone' }).exists(),
      TextField({ placeholder: 'Enter email or phone' }).exists(),
    ]);
  },

  verifyContinueButtonDisabled: () => {
    cy.expect(continueButton.has({ disabled: true }));
  },

  fillUsernameEmailOrPhone: (value) => {
    cy.do(usernameEmailOrPhoneField.fillIn(value));
    cy.expect(usernameEmailOrPhoneField.has({ value }));
  },

  clickContinue: () => {
    cy.expect(continueButton.has({ disabled: false }));
    cy.do(continueButton.click());
  },

  // The address is shown partially hidden when an email was entered; when a username was entered
  // the page doesn't know which address to show (no email argument)
  verifyCheckYourEmailPage: (email) => {
    const sentTo = email ? hideEmailPartially(email) : 'your email address.';

    cy.expect([
      Heading('Check your email').exists(),
      HTML(including(`An email has been sent to ${sentTo}`)).exists(),
    ]);
  },
};
