import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Users from '../../../support/fragments/users/users';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';

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
      cy.getAdminToken();
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

      cy.createTempUser([Permissions.settingsDataImportCanViewOnly.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      // delete generated profiles
      JobProfiles.deleteJobProfile(jobProfileName);
      MatchProfiles.deleteMatchProfile(matchProfileName);
      ActionProfiles.deleteActionProfile(actionProfileName);
      FieldMappingProfileView.deleteViaApi(mappingProfileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353645 Checking the Data import UI permission for only viewing settings (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
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
