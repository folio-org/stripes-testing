import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LanguageAndLocalization from '../../../support/fragments/settings/my-profile/language-and-localization';
import LocaleAcrossApps from '../../../support/fragments/settings/my-profile/locale-across-apps';
import MyProfile from '../../../support/fragments/settings/my-profile/my-profile';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Localization, {
  LANGUAGES,
} from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings', () => {
  describe('My profile', () => {
    describe('Language & localization', () => {
      const randomPostfix = getRandomPostfix();
      // The tenant locale is reset to the default one in before() and in after().
      // All three locales have English labels and differ in the date format only
      const originalTenantLocale = LANGUAGES.AMERICAN_ENGLISH;
      const userLocale = LANGUAGES.SWEDEN_ENGLISH;
      const changedTenantLocale = LANGUAGES.BRITISH_ENGLISH;
      const instanceTitle = `AT_C736685_Instance_${randomPostfix}`;
      const viewCapabilitySets = [
        CapabilitySets.uiInventoryInstanceView,
        CapabilitySets.uiUsersView,
      ];
      const users = {};
      let instanceId;

      const openMyProfileLanguageAndLocalization = () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
        MyProfile.waitLoading();
        MyProfile.openLanguageAndLocalization();
        LanguageAndLocalization.waitLoading();
      };

      const openTenantLanguageAndLocalization = () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        TenantPane.goToTenantTab();
        TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
        Localization.waitLoading();
      };

      const saveMyProfileLocale = (locale) => {
        LanguageAndLocalization.selectLocale(locale);
        LanguageAndLocalization.clickSave();
        InteractorsTools.checkCalloutContainsMessage('successfully');
        LanguageAndLocalization.verifyLocaleSelected(locale);
      };

      // Saving the tenant locale shows the callout, it affects all the users of the tenant
      const saveTenantLocale = (locale) => {
        Localization.changeLocalLanguage(locale);
        Localization.clickSaveButton();
        Localization.verifyLocaleSelected(locale);
      };

      before('Reset tenant locale, create data and users', () => {
        cy.getAdminToken();
        // Tenant-wide setting: start from the default locale
        cy.setDefaultLocaleApi();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C736685_');

        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          instanceId = instanceData.instanceId;
        });

        // User A changes the locale in "My profile", user B - the locale of the tenant
        cy.createTempUser([]).then((userProperties) => {
          users.a = userProperties;
          cy.assignCapabilitiesToExistingUser(
            users.a.userId,
            [],
            [CapabilitySets.settingsMyprofileEnabledView, ...viewCapabilitySets],
          );
        });
        cy.createTempUser([]).then((userProperties) => {
          users.b = userProperties;
          cy.assignCapabilitiesToExistingUser(
            users.b.userId,
            [],
            [CapabilitySets.uiTenantSettingsSettingsLocaleManage, ...viewCapabilitySets],
          );
        });

        cy.then(() => {
          cy.login(users.a.username, users.a.password);
        });
      });

      after('Reset tenant locale, delete test data', () => {
        cy.getAdminToken(false);
        cy.setDefaultLocaleApi();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C736685_');
        Users.deleteViaApi(users.a.userId);
        Users.deleteViaApi(users.b.userId);
      });

      it(
        'C736685 "Locale" selected at "My profile" settings is maintained when "Locale" is changed at "Tenant" settings (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C736685'] },
        () => {
          // Step 1: User A - My profile > Language & localization - select another locale, save
          openMyProfileLanguageAndLocalization();
          saveMyProfileLocale(userLocale);

          // Step 2: several apps - the locale of user A (date format) is applied
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: userLocale.value,
          });

          // Step 3: log out from user A; user B - change the tenant locale to another one, save
          cy.logout();
          cy.login(users.b.username, users.b.password);
          openTenantLanguageAndLocalization();
          saveTenantLocale(changedTenantLocale);

          // Step 4: several apps - the locale of the tenant is applied to user B
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.b.username,
            localeValue: changedTenantLocale.value,
          });

          // Step 5: log out from user B; user A - the own locale is still applied
          cy.logout();
          cy.login(users.a.username, users.a.password);
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: userLocale.value,
          });

          // Step 6: user A - select the locale which matches the tenant one, save
          openMyProfileLanguageAndLocalization();
          saveMyProfileLocale(changedTenantLocale);

          // Step 7: log out from user A; user B - return the original tenant locale, save
          cy.logout();
          cy.login(users.b.username, users.b.password);
          openTenantLanguageAndLocalization();
          saveTenantLocale(originalTenantLocale);

          // Step 8: log out from user B; user A - the locale is NOT changed to the tenant one
          cy.logout();
          cy.login(users.a.username, users.a.password);
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: changedTenantLocale.value,
          });

          // Step 9: My profile > Language & localization - the own locale, not the tenant one
          openMyProfileLanguageAndLocalization();
          LanguageAndLocalization.verifyLocaleSelected(changedTenantLocale);
        },
      );
    });
  });
});
