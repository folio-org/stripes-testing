import { Pane, TextField, Select, Button, Callout, including } from '../../../../../../interactors';

const userLocaleSection = Pane('Save per-user language and localization');
const usernameField = userLocaleSection.find(TextField('Username'));
const timezoneSelect = userLocaleSection.find(Select({ id: 'timezone' }));
const numberingSystemSelect = userLocaleSection.find(Select({ id: 'numberingSystem' }));
const primaryCurrencySelect = userLocaleSection.find(Select({ id: 'currency' }));
const saveButton = userLocaleSection.find(Button({ id: 'clickable-save-instance' }));

export default {
  waitLoading() {
    cy.expect(userLocaleSection.exists());
  },

  fillUsername(username) {
    cy.do(usernameField.fillIn(username));
  },

  selectTimezone(timezone) {
    cy.do(timezoneSelect.choose(timezone));
  },

  selectNumberingSystem(numberingSystem) {
    cy.do(numberingSystemSelect.choose(numberingSystem));
  },

  selectPrimaryCurrency(currency) {
    cy.do(primaryCurrencySelect.choose(currency));
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  verifySuccessCallout(username) {
    cy.expect(Callout(including(`Successfully stored locale settings for ${username}`)).exists());
  },

  configureUserLocale({ username, timezone, numberingSystem, currency }) {
    if (username) {
      this.fillUsername(username);
    }
    if (timezone) {
      this.selectTimezone(timezone);
    }
    if (numberingSystem) {
      this.selectNumberingSystem(numberingSystem);
    }
    if (currency) {
      this.selectPrimaryCurrency(currency);
    }
    this.clickSave();
    this.verifySuccessCallout(username);
  },
};
