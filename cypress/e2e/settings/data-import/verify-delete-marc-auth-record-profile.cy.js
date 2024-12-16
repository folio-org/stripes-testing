import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { SettingsDataImport } from '../../../support/fragments/settings/dataImport';
import { SETTINGS_TABS } from '../../../support/fragments/settings/dataImport/settingsDataImport';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const profiles = [
      'Job profiles',
      'Match profiles',
      'Action profiles',
      'Field mapping profiles',
    ];
    const profileName = 'MARC Authority - Default Delete Authorities';

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportCanViewOnly.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.dataImportSettingsPath,
          waiter: SettingsDataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350645 Suppress the data import profiles, being used for deleting MARC Authority record, from the Data Import settings UI (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350645'] },
      () => {
        profiles.forEach((profile) => {
          DataImport.verifyDataImportProfiles(profile);
        });

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(profileName);
        JobProfiles.verifyJobProfileAbsent();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.search(profileName);
        MatchProfiles.verifyMatchProfileAbsent();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.search(profileName);
        ActionProfiles.verifyActionProfileAbsent();

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(profileName);
        FieldMappingProfiles.verifyMappingProfileAbsent();
      },
    );
  });
});
