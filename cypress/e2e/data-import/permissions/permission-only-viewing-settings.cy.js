import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;

    // profile names for creating
    const mappingProfileName = `C353645_mapping_profile_${getRandomPostfix()}`;
    const actionProfileName = `C353645_action_profile_${getRandomPostfix()}`;
    const matchProfileName = `C353645_match_profile_${getRandomPostfix()}`;
    const jobProfileName = `C353645_job_profile_${getRandomPostfix()}`;
    const fileExtensionName = '.dat';

    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportCanViewOnly.gui]).then((userProperties) => {
        user = userProperties;

        NewFieldMappingProfile.createMappingProfileViaApi(mappingProfileName).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              actionProfileName,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              NewMatchProfile.createMatchProfileViaApi(matchProfileName).then(
                (matchProfileResponse) => {
                  NewJobProfile.createJobProfileViaApi(
                    jobProfileName,
                    matchProfileResponse.body.id,
                    actionProfileResponse.body.id,
                  );
                },
              );
            });
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C353645 Checking the Data import UI permission for only viewing settings (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifyActionMenuAbsent();
        JobProfiles.search(jobProfileName);
        JobProfiles.selectJobProfile(jobProfileName);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyActionMenuAbsent();

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifyActionMenuAbsent();
        MatchProfiles.search(matchProfileName);
        MatchProfiles.selectMatchProfileFromList(matchProfileName);
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfiles.verifyActionMenuAbsent(matchProfileName);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.verifyActionMenuAbsent();
        ActionProfiles.search(actionProfileName);
        ActionProfiles.selectActionProfileFromList(actionProfileName);
        ActionProfileView.verifyActionProfileOpened();
        ActionProfileView.verifyActionMenuAbsent();

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.verifyActionMenuAbsent();
        FieldMappingProfiles.search(mappingProfileName);
        FieldMappingProfiles.selectMappingProfileFromList(mappingProfileName);
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyActionMenuAbsent();

        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.verifyActionMenuAbsent();
        FileExtensions.select(fileExtensionName);
        FileExtensionView.verifyActionMenuAbsent();

        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.verifyNewButtonAbsent();
      },
    );
  });
});
