import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import LanguageAndLocalization from '../../../support/fragments/settings/my-profile/language-and-localization';
import MyProfile from '../../../support/fragments/settings/my-profile/my-profile';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Localization, {
  LANGUAGES,
} from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Settings', () => {
  describe('My profile', () => {
    describe('Language & localization', () => {
      const tenantLocale = LANGUAGES.AMERICAN_ENGLISH;
      const changedTenantLocale = LANGUAGES.BRITISH_ENGLISH;
      let user;

      before('Reset tenant locale, create user, login', () => {
        cy.getAdminToken();
        // Tenant-wide setting: start from the default locale
        cy.setDefaultLocaleApi();

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(
            user.userId,
            [],
            [
              CapabilitySets.settingsMyprofileEnabledView,
              CapabilitySets.uiTenantSettingsSettingsLocaleManage,
            ],
          );

          cy.login(user.username, user.password);
        });
      });

      after('Reset tenant locale, delete user', () => {
        cy.getAdminToken(false);
        cy.setDefaultLocaleApi();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C736682 Default value of "Locale" on "My profile" > "Language & localization" pane matches with "Locale" selected on tenant level (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C736682'] },
        () => {
          // Step 1: Open Settings; "My profile" icon is a picture
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.verifyMyProfileIconInSettings();

          // Step 2: Tenant > Language and localization - note the selected locale
          TenantPane.goToTenantTab();
          TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
          Localization.waitLoading();
          Localization.verifyLocaleSelected(tenantLocale);

          // Step 3: My profile - "Language & localization" is the last tab
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
          MyProfile.waitLoading();
          MyProfile.verifyLanguageAndLocalizationIsLastTab();

          // Step 4: Language & localization pane shows the tenant locale, buttons disabled
          MyProfile.openLanguageAndLocalization();
          LanguageAndLocalization.waitLoading();
          LanguageAndLocalization.verifyPaneContent();
          LanguageAndLocalization.verifyLocaleSelected(tenantLocale);

          // Step 5: change the tenant locale (affects all users; reset in after())
          TenantPane.goToTenantTab();
          TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
          Localization.waitLoading();
          Localization.changeLocalLanguage(changedTenantLocale);
          Localization.clickSaveButton();
          Localization.verifyLocaleSelected(changedTenantLocale);

          // Step 6: My profile locale follows the tenant locale
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
          MyProfile.waitLoading();
          MyProfile.openLanguageAndLocalization();
          LanguageAndLocalization.waitLoading();
          LanguageAndLocalization.verifyLocaleSelected(changedTenantLocale);

          // Step 7: return the previous tenant locale
          TenantPane.goToTenantTab();
          TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
          Localization.waitLoading();
          Localization.changeLocalLanguage(tenantLocale);
          Localization.clickSaveButton();
          Localization.verifyLocaleSelected(tenantLocale);
        },
      );
    });
  });
});
