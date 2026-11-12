import { APPLICATION_NAMES } from '../../../constants';
import InstanceRecordView from '../../inventory/instanceRecordView';
import InventoryInstance from '../../inventory/inventoryInstance';
import InventoryInstances from '../../inventory/inventoryInstances';
import TopMenuNavigation from '../../topMenuNavigation';
import UsersCard from '../../users/usersCard';
import UsersSearchPane from '../../users/usersSearchPane';
import SettingsPane from '../settingsPane';
import Localization from '../tenant/general/localization';
import TenantPane, { TENANTS } from '../tenant/tenantPane';
import LanguageAndLocalization from './language-and-localization';
import MyProfile from './my-profile';

// Date and time of "Record last updated" as they are shown for the locale. The labels of the three
// locales are in English, so they don't change the text of the pages, only the date format
// (the locales are in LANGUAGES of the tenant "Language and localization" fragment).
export const LOCALE_DATE_FORMATS = {
  // American English: 11/21/2026, 3:04 PM
  'en-US': /^\d{1,2}\/\d{1,2}\/\d{4}/,
  // British English: 21/11/2026 15:04 (24-hour clock with a leading zero, no AM/PM, no comma)
  'en-GB': /^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}(?!\s?[AP]M)/,
  // English (Sweden): 2026-11-21, 15:04
  'en-SE': /^\d{4}-\d{2}-\d{2}/,
};

export default {
  openMyProfileLanguageAndLocalization() {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
    SettingsPane.waitLoading();
    SettingsPane.selectSettingsTab(APPLICATION_NAMES.MY_PROFILE);
    MyProfile.waitLoading();
    MyProfile.openLanguageAndLocalization();
    LanguageAndLocalization.waitLoading();
  },

  openTenantLanguageAndLocalization() {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
    SettingsPane.waitLoading();
    TenantPane.goToTenantTab();
    TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
    Localization.waitLoading();
  },

  saveMyProfileLocale(userId, locale) {
    LanguageAndLocalization.selectLocale(locale);
    LanguageAndLocalization.clickSave();
    LanguageAndLocalization.verifyUserLocaleSavedViaApi(userId, locale);
    LanguageAndLocalization.verifyLocaleSelected(locale);
  },

  // Saving the tenant locale shows the callout, it affects all the users of the tenant
  saveTenantLocale(locale) {
    Localization.changeLocalLanguage(locale);
    Localization.clickSaveButton();
    Localization.verifyLocaleSelected(locale);
  },

  // Opens the own instance in Inventory and the own user in Users and checks the format of the
  // "Record last updated" date in both apps; localeValue - the value of the locale, e.g. 'en-SE'
  verifyDateFormatInApps({ instanceId, username, localeValue }) {
    const dateFormat = LOCALE_DATE_FORMATS[localeValue];

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
  },
};
