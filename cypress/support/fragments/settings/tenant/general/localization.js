import { HTML, including } from '@interactors/html';

import { Button, Form, Label, Link, Pane, Select } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const localeLabel = 'Locale (for language display, date format etc.)';
const timeZoneLabel = 'Time zone (time zone used when showing date time information)';
const primaryCurrencyLabel = 'Primary currency (for currency symbol to display)';
const numberingSystemLabel = 'Numbering system';

const rootPane = Form({ id: 'locale-form' });
const changeSessionLocaleLink = rootPane.find(Link('Change session locale'));
const localeSelect = rootPane.find(Select(including(localeLabel)));
const numberingSystemSelect = rootPane.find(Select(including(numberingSystemLabel)));
const timeZoneSelect = rootPane.find(Select(including(timeZoneLabel)));
const primaryCurrencySystemSelect = rootPane.find(Select(including(primaryCurrencyLabel)));
const saveButton = rootPane.find(Button({ type: 'submit' }));
const lockIcon = HTML({ className: including('icon-lock') });

// needed for prod tenants with non-English default language, where this button originally can have different name
const AmericanEnglishButton = "//button[.//span[contains(normalize-space(.), 'American English')]]";

export const LANGUAGES = {
  AMERICAN_ENGLISH: { name: 'American English / American English', value: 'en-US' },
  BRITISH_ENGLISH: { name: 'British English / British English', value: 'en-GB' },
  SWEDEN_ENGLISH: { name: 'English (Sweden) / English (Sweden)', value: 'en-SE' },
};

export const NUMBERS = {
  NONE: { name: '---', value: '' },
  LATN: { name: 'latn (0 1 2 3 4 5 6 7 8 9)', value: 'latn' },
  ARAB: { name: 'arab (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩)', value: 'arab' },
};

export default {
  waitLoading() {
    cy.expect(Pane('Language and localization').exists());
  },
  checkPaneContent(hasPermission = true) {
    if (hasPermission) {
      cy.expect([changeSessionLocaleLink.exists()]);
    }
    cy.expect([
      localeSelect.exists(),
      numberingSystemSelect.exists(),
      timeZoneSelect.exists(),
      primaryCurrencySystemSelect.exists(),
    ]);
  },
  checkLockIcons() {
    cy.expect([
      Label(including(localeLabel)).find(lockIcon).exists(),
      Label(including(numberingSystemLabel)).find(lockIcon).exists(),
      Label(including(timeZoneLabel)).find(lockIcon).exists(),
      Label(including(primaryCurrencyLabel)).find(lockIcon).exists(),
    ]);
  },
  changeLocalLanguage(language) {
    cy.do(localeSelect.choose(language.name));
    cy.expect(localeSelect.has({ value: language.value }));
  },
  changeTimezone(timezone) {
    cy.do(timeZoneSelect.choose(timezone));
    cy.expect(timeZoneSelect.has({ value: timezone }));
  },
  changeNumberingSystem(system) {
    cy.do(numberingSystemSelect.choose(system.name));
    cy.expect(numberingSystemSelect.has({ value: system.value }));
  },
  clickSaveButton() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
    // need to wait for changes to be applied
    cy.wait(2000);
  },
  clickChangeSessionLocalLanguage() {
    cy.do(changeSessionLocaleLink.click());
  },
  // needed for prod tenants with non-English default language
  americanEnglishButtonWaitLoading() {
    cy.xpath(AmericanEnglishButton).should('be.visible').should('not.be.disabled');
  },
  selectAmericanEnglish() {
    // Intercept the translations fetch
    cy.intercept('GET', '**/translations/en_US-*.json').as('translations');

    cy.xpath(AmericanEnglishButton).should('be.visible').click();

    // Wait for changes to apply and translations to load
    cy.wait('@translations');
  },
};
