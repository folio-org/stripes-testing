import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { SettingsDataImport, MatchProfiles } from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      matchProfileName: '',
      user: {},
    };

    before('Create test user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      testData.matchProfileName = `autotest_match_profile_name_${getRandomPostfix()}`;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.dataImportSettingsPath,
        waiter: SettingsDataImport.waitLoading,
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C411853 Match profile: update options for Holdings "Incoming records" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILE);

        // Click "Actions" button, Select "New match profile" option
        const MatchProfileEditForm = MatchProfiles.clickCreateNewMatchProfile();

        // Click on "Holdings" option as the "Existing records" type
        MatchProfileEditForm.selectExistingRecordType(EXISTING_RECORDS_NAMES.HOLDINGS);

        // Dropdown list opens and correct options appears
        MatchProfileEditForm.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        // MARC Authority is NOT present in available options
        MatchProfileEditForm.verifyIncomingRecordsItemDoesNotExist('MARC Authority');
      },
    );

    it(
      'C411857 Match profile: update options for Item "Incoming records" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to Settings application-> Data import-> Match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILE);

        const MatchProfileEditForm = MatchProfiles.clickCreateNewMatchProfile();

        // Click on "Item" option as the "Existing records" type
        MatchProfileEditForm.selectExistingRecordType(EXISTING_RECORDS_NAMES.ITEM);

        // Dropdown list opens and correct options appears
        MatchProfileEditForm.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        // MARC Authority is NOT present in available options
        MatchProfileEditForm.verifyIncomingRecordsItemDoesNotExist('MARC Authority');
      },
    );
  });
});
