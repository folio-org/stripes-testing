import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
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
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';

describe('ui-data-import:', () => {
  let user;

  // profile names for creating
  const mappingProfileName = `C353645_mapping_profile_${getRandomPostfix()}`;
  const actionProfileName = `C353645_action_profile_${getRandomPostfix()}`;
  const matchProfileName = `C353645_match_profile_${getRandomPostfix()}`;
  const jobProfileName = `C353645_job_profile_${getRandomPostfix()}`;

  before('create test data', () => {
    let mapProileId;
    let actProfileId;
    let matchProfileId;
    cy.getAdminToken();
    NewFieldMappingProfile.createMappingProfileViaApi(mappingProfileName)
      .then((mappingProfileResponse) => {
        mapProileId = mappingProfileResponse.body.id;

        NewActionProfile.createActionProfileViaApi(actionProfileName, mapProileId)
          .then((actionProfileResponse) => {
            actProfileId = actionProfileResponse.body.id;

            NewMatchProfile.createMatchProfileViaApi(matchProfileName)
              .then((matchProfileResponse) => {
                matchProfileId = matchProfileResponse.body.id;

                NewJobProfile.createMatchProfileViaApi(jobProfileName, matchProfileId, actProfileId);
              });
          });
      });

    cy.createTempUser([
      permissions.settingsDataImportCanViewOnly.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });
  });

  after(() => {
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });

  it('C353645 Checking the Data import UI permission for only viewing settings (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.checkListOfExistingProfilesIsDisplayed();
      JobProfiles.verifyActionMenuAbsent();
      JobProfiles.selectJobProfile(jobProfileName);
      JobProfileView.verifyJobProfileOpened();
      JobProfileView.verifyActionMenuAbsent();

      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.checkListOfExistingProfilesIsDisplayed();
      MatchProfiles.verifyActionMenuAbsent();
      MatchProfiles.selectMatchProfileFromList(matchProfileName);
      MatchProfileView.verifyMatchProfileOpened();
      MatchProfiles.verifyActionMenuAbsent(matchProfileName);

      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.checkListOfExistingProfilesIsDisplayed();
      ActionProfiles.verifyActionMenuAbsent();
      ActionProfiles.selectActionProfileFromList(actionProfileName);
      ActionProfileView.verifyActionProfileOpened();
      ActionProfileView.verifyActionMenuAbsent();

      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
      FieldMappingProfiles.verifyActionMenuAbsent();
      FieldMappingProfiles.selectMappingProfileFromList(mappingProfileName);
      FieldMappingProfileView.verifyMappingProfileOpened();
      FieldMappingProfileView.verifyActionMenuAbsent();

      cy.visit(SettingsMenu.fileExtensionsPath);
      FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
      FileExtensions.verifyActionMenuAbsent();
      FileExtensions.select();
      FileExtensions.verifyActionMenuOnViewPaneAbsent();

      cy.visit(SettingsMenu.marcFieldProtectionPath);
      MarcFieldProtection.checkListOfExistingProfilesIsDisplayed();
      MarcFieldProtection.verifyNewButtonAbsent();
    });
});
