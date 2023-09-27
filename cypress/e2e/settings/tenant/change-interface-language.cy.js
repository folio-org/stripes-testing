import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Localication, {
  LANGUAGES,
  NUMBERS,
} from '../../../support/fragments/settings/tenant/general/localication';

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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C377044 Verify that the interface language is changed if user choose Numbering system has a value (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // Select "Language and localization" option
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localication.checkPaneContent();

      // Click on the "Locale (for language display, date format etc.)" language
      Localication.changeLocalLanguage(LANGUAGES.BRITISH_ENGLISH);

      // Click on the "Numbering system" dropdown and select "latn (0 1 2 3 4 5 6 7 8 9)" option => Click "Save" button
      Localication.changeNumberingSystem(NUMBERS.LATN);
      Localication.clickSaveButton();

      // Click on the "Locale (for language display, date format etc.)" dropdown and select "English (Sweden) / English (Sweden)" language => Click "Save" button
      Localication.changeLocalLanguage(LANGUAGES.SWEDEN_ENGLISH);
      Localication.clickSaveButton();

      // Click on the "Numbering system" dropdown and select "arab" option => Click "Save" button
      Localication.changeNumberingSystem(NUMBERS.ARAB);
      Localication.clickSaveButton();

      // Click on the "Locale (for language display, date format etc.)" dropdown and select "American English/American English" language => Click "Save" button
      Localication.changeLocalLanguage(LANGUAGES.AMERICAN_ENGLISH);

      // Click on the "Numbering system" dropdown and select "---" (no) option => Click "Save" button
      Localication.changeNumberingSystem(NUMBERS.NONE);
      Localication.clickSaveButton();
    },
  );
});
