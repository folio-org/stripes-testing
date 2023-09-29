import { Button, Form, Link, Pane, Select } from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const rootPane = Form({ id: 'locale-form' });
const changeSessionLocaleLink = rootPane.find(Link('Change session locale'));
const localeSelect = rootPane.find(Select('Locale (for language display, date format etc.)'));
const numberingSystemSelect = rootPane.find(Select('Numbering system'));
const timeZoneSelect = rootPane.find(
  Select('Time zone (time zone used when showing date time information)'),
);
const primaryCurrencySystemSelect = rootPane.find(
  Select('Primary currency (for currency symbol to display)'),
);
const saveButton = rootPane.find(Button({ type: 'submit' }));

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
  checkPaneContent() {
    cy.expect([
      changeSessionLocaleLink.exists(),
      localeSelect.exists(),
      numberingSystemSelect.exists(),
      timeZoneSelect.exists(),
      primaryCurrencySystemSelect.exists(),
    ]);
  },
  changeLocalLanguage(language) {
    cy.do(localeSelect.choose(language.name));
    cy.expect(localeSelect.has({ value: language.value }));
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
};
