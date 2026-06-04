import { Pane, Select, Button } from '../../../../../interactors';

const languageAndLocalizationSection = Pane('Language & localization');
const localeSelect = languageAndLocalizationSection.find(Select({ id: 'locale' }));
const saveButton = languageAndLocalizationSection.find(Button({ id: 'clickable-save-config' }));

export default {
  waitLoading() {
    cy.expect(languageAndLocalizationSection.exists());
  },

  selectLocale(locale) {
    cy.do(localeSelect.choose(locale.name));
    cy.expect(localeSelect.has({ value: locale.value }));
  },

  clickSave() {
    cy.do(saveButton.click());
  },
};
