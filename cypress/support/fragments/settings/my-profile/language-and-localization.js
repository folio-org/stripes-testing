import { Pane, Select, Button } from '../../../../../interactors';

const languageAndLocalizationSection = Pane('Language & localization');
const localeSelect = languageAndLocalizationSection.find(Select({ id: 'locale' }));
const saveButton = languageAndLocalizationSection.find(Button({ id: 'clickable-save-config' }));
const resetToDefaultButton = languageAndLocalizationSection.find(Button('Reset to default'));

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

  verifyPaneContent() {
    cy.expect([
      localeSelect.exists(),
      saveButton.has({ disabled: true }),
      resetToDefaultButton.has({ disabled: true }),
    ]);
  },

  verifyLocaleSelected(locale) {
    cy.expect(localeSelect.has({ value: locale.value }));
  },
};
