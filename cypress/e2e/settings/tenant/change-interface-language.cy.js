import { Permissions } from '../../../support/dictionary';
import Localization, {
  LANGUAGES,
  NUMBERS,
} from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Settings: Tenant', () => {
  const testData = {
    user: {},
  };

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiSettingsDeveloperSessionLocale.gui,
      Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    // in case the test fails, return the language and localization settings to their default values
    cy.setDefaultLocaleApi();
  });

  // Marked as flaky because it changes global Tenant settings and causes failures in other tests during parallel runs.

  it(
    'C377044 Verify that the interface language is changed if user choose Numbering system has a value (firebird) (TaaS)',
    { tags: ['extendedPathFlaky', 'firebird', 'C377044', 'eurekaPhase1'] },
    () => {
      // Select "Language and localization" option
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.checkPaneContent();

      // Click on the "Locale (for language display, date format etc.)" language
      Localization.changeLocalLanguage(LANGUAGES.BRITISH_ENGLISH);

      // Click on the "Numbering system" dropdown and select "latn (0 1 2 3 4 5 6 7 8 9)" option => Click "Save" button
      Localization.changeNumberingSystem(NUMBERS.LATN);
      Localization.clickSaveButton();

      // Click on the "Locale (for language display, date format etc.)" dropdown and select "English (Sweden) / English (Sweden)" language => Click "Save" button
      Localization.changeLocalLanguage(LANGUAGES.SWEDEN_ENGLISH);
      Localization.clickSaveButton();

      // Click on the "Numbering system" dropdown and select "arab" option => Click "Save" button
      Localization.changeNumberingSystem(NUMBERS.ARAB);
      Localization.clickSaveButton();

      // Click on the "Locale (for language display, date format etc.)" dropdown and select "American English/American English" language => Click "Save" button
      Localization.changeLocalLanguage(LANGUAGES.AMERICAN_ENGLISH);

      // Click on the "Numbering system" dropdown and select "---" (no) option => Click "Save" button
      Localization.changeNumberingSystem(NUMBERS.NONE);
      Localization.clickSaveButton();
    },
  );
});
