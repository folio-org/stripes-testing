import { Pane, Dropdown, Button, TextField } from '../../../../../interactors';

const myProfile = Dropdown('My profile');
const currentPasswordField = TextField('Current FOLIO password');
const newPasswordField = TextField('New FOLIO password');
const confirmPasswordField = TextField('Confirm FOLIO password');
const saveButton = Button({ id: 'change-password-submit-btn' });

const messages = {
  mismatch: 'New and confirm password does not match. Retype your password.',
  enterValue: 'Please enter a value.',
  notEnoughSymbols: 'The password length must be minimum 8 symbols.',
};

export default {
  messages,
  waitLoading() {
    cy.expect(Pane('Change password').exists());
  },

  openChangePasswordViaUserProfile() {
    cy.do([myProfile.open(), myProfile.find(Button('Change Password')).click()]);
    this.waitLoading();
  },

  checkInitialState() {
    cy.expect([
      currentPasswordField.exists(),
      newPasswordField.exists(),
      confirmPasswordField.exists(),
      saveButton.is({ disabled: true }),
    ]);
  },

  typeCurrentPassword(password) {
    cy.do([currentPasswordField.fillIn(password), currentPasswordField.blur()]);
  },

  verifyCurrentPasswordMessage(message) {
    cy.expect(currentPasswordField.has({ error: message }));
  },

  typeNewPassword(password) {
    cy.do([newPasswordField.fillIn(password), newPasswordField.blur()]);
  },

  verifyNewPasswordMessage(message) {
    cy.expect(newPasswordField.has({ error: message }));
  },

  typeConfirmPassword(password) {
    cy.do([confirmPasswordField.fillIn(password), confirmPasswordField.blur()]);
  },

  verifyConfirmPasswordMessage(message) {
    cy.expect(confirmPasswordField.has({ error: message }));
  },

  verifySaveButtonInactive() {
    cy.expect(saveButton.is({ disabled: true }));
  },

  clearAllFields() {
    cy.do([
      currentPasswordField.fillIn(' '),
      currentPasswordField.clear(),
      newPasswordField.fillIn(' '),
      newPasswordField.clear(),
      confirmPasswordField.fillIn(' '),
      confirmPasswordField.clear(),
    ]);
  },

  saveNewPassword() {
    cy.expect(saveButton.is({ disabled: false }));
    cy.do(saveButton.click());
  },
};
