import { Pane, Select, Button, including } from '../../../../../interactors';

const languageAndLocalizationSection = Pane('Language & localization');
const localeSelect = languageAndLocalizationSection.find(Select({ id: 'locale' }));
const saveButton = languageAndLocalizationSection.find(Button({ id: 'clickable-save-config' }));
const resetToDefaultButton = languageAndLocalizationSection.find(Button('Reset to default'));

export default {
  waitLoading() {
    cy.expect(languageAndLocalizationSection.exists());
  },

  selectLocale(locale) {
    cy.do(localeSelect.choose(including(locale.name)));
    cy.expect(localeSelect.has({ value: locale.value }));
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  // The pane requests the saved locale of the user (the query with userId=="...") when it opens.
  // "Reset to default" clicked before that request is finished is sent as a new entry (POST) and is
  // rejected (403), so nothing is saved although the form is already reset. Call before opening
  // the pane, then wait after it.
  interceptUserLocaleEntryRequest() {
    cy.intercept('GET', /settings\/entries\?query=userId==%22.*key==%22localeSettings/).as(
      'userLocaleEntry',
    );
  },

  waitUserLocaleEntryLoaded() {
    cy.wait('@userLocaleEntry');
  },

  clickResetToDefault() {
    cy.expect(resetToDefaultButton.has({ disabled: false }));
    cy.do(resetToDefaultButton.click());
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

  // The success callout can't be checked: the app re-renders for the new locale and removes it
  // in about 0.2 sec, so the saved user's locale is checked via API instead
  verifyUserLocaleSavedViaApi(userId, locale) {
    cy.recurse(
      () => cy.getUserLocaleSettingApi(userId),
      ({ body }) => body.items?.[0]?.value?.locale === locale.value,
      {
        limit: 10,
        delay: 1000,
        timeout: 15_000,
      },
    );
  },

  // "Reset to default" changes the form at once, but the user's locale is cleared on the server a
  // bit later and only if the pane stays open, so wait for it before leaving the pane
  verifyUserLocaleResetViaApi(userId) {
    cy.recurse(
      () => cy.getUserLocaleSettingApi(userId),
      ({ body }) => !body.items?.[0]?.value?.locale,
      {
        limit: 10,
        delay: 1000,
        timeout: 15_000,
      },
    );
  },
};
