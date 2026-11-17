import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LanguageAndLocalization from '../../../support/fragments/settings/my-profile/language-and-localization';
import MyProfile from '../../../support/fragments/settings/my-profile/my-profile';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Localization, {
  LANGUAGES,
} from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings', () => {
  describe('My profile', () => {
    describe('Language & localization', () => {
      const randomPostfix = getRandomPostfix();
      // Tenant locale is reset to the default one in before(). "English (Sweden)" keeps the labels
      // in English (the steps don't depend on the text) but shows dates as 2026-11-11, 15:04
      const tenantLocale = LANGUAGES.AMERICAN_ENGLISH;
      const userLocale = LANGUAGES.SWEDEN_ENGLISH;
      const tenantDateFormat = /^\d{1,2}\/\d{1,2}\/\d{4}/;
      const userDateFormat = /^\d{4}-\d{2}-\d{2}/;
      const instanceTitle = `AT_C736683_Instance_${randomPostfix}`;
      const viewCapabilitySets = [
        CapabilitySets.uiInventoryInstanceView,
        CapabilitySets.uiUsersView,
      ];
      const users = {};
      let instanceId;

      // "Record last updated" of the own instance and own user - dates in the locale format
      const verifyDateFormatInApps = (username, dateFormat) => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.getLastUpdatedDateAndTime().then((dateAndTime) => {
          expect(dateAndTime).to.match(dateFormat);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.waitLoading();
        UsersSearchPane.openUserCard(username);
        UsersCard.waitLoading();
        UsersCard.getLastUpdatedDateAndTime().then((dateAndTime) => {
          expect(dateAndTime).to.match(dateFormat);
        });
      };

      before('Reset tenant locale, create data and users', () => {
        cy.getAdminToken();
        // Tenant-wide setting: start from the default locale
        cy.setDefaultLocaleApi();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C736683_');

        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          instanceId = instanceData.instanceId;
        });

        // User A can change the locale in "My profile", user B - the locale of the tenant
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('C736683_');
        Users.deleteViaApi(users.a.userId);
        Users.deleteViaApi(users.b.userId);
      });

      it(
        'C736683 Change "Locale" on "My profile" > "Language & localization" pane and verify that changes applied across several apps after re-login (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C736683'] },
        () => {
          // Step 1: User A - My profile > Language & localization - select another locale, save
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
          MyProfile.waitLoading();
          MyProfile.openLanguageAndLocalization();
          LanguageAndLocalization.waitLoading();
          LanguageAndLocalization.selectLocale(userLocale);
          LanguageAndLocalization.clickSave();
          InteractorsTools.checkCalloutContainsMessage('successfully');
          LanguageAndLocalization.verifyLocaleSelected(userLocale);

          // Step 2: several apps - the selected locale (date format) is applied
          verifyDateFormatInApps(users.a.username, userDateFormat);

          // Step 3: log out from user A
          cy.logout();

          // Step 4: user B - several apps - the locale of user A is not applied
          cy.login(users.b.username, users.b.password);
          verifyDateFormatInApps(users.b.username, tenantDateFormat);

          // Step 5: Settings > Tenant > Language and localization - the tenant locale differs
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          TenantPane.goToTenantTab();
          TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
          Localization.waitLoading();
          Localization.verifyLocaleSelected(tenantLocale);

          // Step 6: log out from user B
          cy.logout();

          // Step 7: user A again - the selected locale is still applied
          cy.login(users.a.username, users.a.password);
          verifyDateFormatInApps(users.a.username, userDateFormat);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
          MyProfile.waitLoading();
          MyProfile.openLanguageAndLocalization();
          LanguageAndLocalization.waitLoading();
          LanguageAndLocalization.verifyLocaleSelected(userLocale);
        },
      );
    });
  });
});
