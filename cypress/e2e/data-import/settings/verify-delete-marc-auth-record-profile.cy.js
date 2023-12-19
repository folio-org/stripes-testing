import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
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
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350645 Suppress the data import profiles, being used for deleting MARC Authority record, from the Data Import settings UI (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.visit(SettingsMenu.dataImportSettingsPath);
        profiles.forEach((profile) => {
          DataImport.verifyDataImportProfiles(profile);
        });

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(profileName);
        JobProfiles.verifyJobProfileAbsent();

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.search(profileName);
        MatchProfiles.verifyMatchProfileAbsent();

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.search(profileName);
        ActionProfiles.verifyActionProfileAbsent();

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(profileName);
        FieldMappingProfiles.verifyMappingProfileAbsent();
      },
    );
  });
});
