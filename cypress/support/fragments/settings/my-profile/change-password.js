import { Pane, Dropdown, Button, TextField, including } from '../../../../../interactors';

const myProfile = Dropdown(including('profile'));
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
    cy.wait(500);
  },

  verifyCurrentPasswordMessage(message) {
    cy.expect(currentPasswordField.has({ error: message }));
    cy.wait(500);
  },

  typeNewPassword(password) {
    cy.do([newPasswordField.fillIn(password), newPasswordField.blur()]);
    cy.wait(500);
  },

  verifyNewPasswordMessage(message) {
    cy.expect(newPasswordField.has({ error: message }));
    cy.wait(500);
  },

  typeConfirmPassword(password) {
    cy.do([confirmPasswordField.fillIn(password), confirmPasswordField.blur()]);
    cy.wait(500);
  },

  verifyConfirmPasswordMessage(message) {
    cy.expect(confirmPasswordField.has({ error: message }));
    cy.wait(500);
  },

  verifySaveButtonInactive() {
    cy.expect(saveButton.is({ disabled: true }));
    cy.wait(500);
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
    cy.wait(500);
  },

  saveNewPassword() {
    cy.expect(saveButton.is({ disabled: false }));
    cy.do(saveButton.click());
    cy.wait(3000);
  },

  fillPasswordFields(currentPassword, newPassword, confirmPassword) {
    this.typeCurrentPassword(currentPassword);
    cy.wait(1000);
    this.typeNewPassword(newPassword);
    cy.wait(1000);
    this.typeConfirmPassword(confirmPassword);
  },

  verifyPasswordSaved() {
    cy.url().should('not.contain', '/change-password');
  },
};
