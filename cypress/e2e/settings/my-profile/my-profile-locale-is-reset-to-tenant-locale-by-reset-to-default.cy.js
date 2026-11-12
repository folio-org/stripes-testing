import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LanguageAndLocalization from '../../../support/fragments/settings/my-profile/language-and-localization';
import LocaleAcrossApps from '../../../support/fragments/settings/my-profile/locale-across-apps';
import Localization, {
  LANGUAGES,
} from '../../../support/fragments/settings/tenant/general/localization';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings', () => {
  describe('My profile', () => {
    describe('Language & localization', () => {
      const randomPostfix = getRandomPostfix();
      // The tenant locale is reset to the default one in before() and in after().
      // All three locales have English labels and differ in the date format only
      const tenantLocale = LANGUAGES.AMERICAN_ENGLISH;
      const userLocale = LANGUAGES.SWEDEN_ENGLISH;
      const changedTenantLocale = LANGUAGES.BRITISH_ENGLISH;
      const instanceTitle = `AT_C794528_Instance_${randomPostfix}`;
      const viewCapabilitySets = [
        CapabilitySets.uiInventoryInstanceView,
        CapabilitySets.uiUsersView,
      ];
      const users = {};
      let instanceId;

      before('Reset tenant locale, create data and users', () => {
        cy.getAdminToken();
        // Tenant-wide setting: start from the default locale
        cy.setDefaultLocaleApi();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C794528_');

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
        InventoryInstances.deleteFullInstancesByTitleViaApi('C794528_');
        Users.deleteViaApi(users.a.userId);
        Users.deleteViaApi(users.b.userId);
      });

      it(
        'C794528 "Locale" selected at "My profile" settings is changed to "Tenant" level when "Reset to default" button is clicked (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C794528'] },
        () => {
          // Step 1: User A - My profile > Language & localization - select another locale, save
          LocaleAcrossApps.openMyProfileLanguageAndLocalization();
          LocaleAcrossApps.saveMyProfileLocale(users.a.userId, userLocale);

          // Step 2: several apps - the locale of user A (date format) is applied
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: userLocale.value,
          });

          // Step 3: My profile > Language & localization - "Reset to default" - the tenant locale
          LanguageAndLocalization.interceptUserLocaleEntryRequest();
          LocaleAcrossApps.openMyProfileLanguageAndLocalization();
          LanguageAndLocalization.waitUserLocaleEntryLoaded();
          LanguageAndLocalization.clickResetToDefault();
          LanguageAndLocalization.verifyLocaleSelected(tenantLocale);
          LanguageAndLocalization.verifyUserLocaleResetViaApi(users.a.userId);

          // Step 4: several apps - the locale of the tenant is applied
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: tenantLocale.value,
          });

          // Step 5: log out from user A; user B - change the tenant locale to another one, save
          cy.logout();
          cy.login(users.b.username, users.b.password);
          LocaleAcrossApps.openTenantLanguageAndLocalization();
          LocaleAcrossApps.saveTenantLocale(changedTenantLocale);
          Localization.verifyTenantLocaleSavedViaApi(changedTenantLocale);

          // Step 6: several apps - the locale of the tenant is applied to user B
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.b.username,
            localeValue: changedTenantLocale.value,
          });

          // Step 7: log out from user B; user A - the new tenant locale is applied
          cy.logout();
          cy.login(users.a.username, users.a.password);
          LocaleAcrossApps.verifyDateFormatInApps({
            instanceId,
            username: users.a.username,
            localeValue: changedTenantLocale.value,
          });

          // Step 8: My profile > Language & localization - the new tenant locale is selected
          LocaleAcrossApps.openMyProfileLanguageAndLocalization();
          LanguageAndLocalization.verifyLocaleSelected(changedTenantLocale);
        },
      );
    });
  });
});
