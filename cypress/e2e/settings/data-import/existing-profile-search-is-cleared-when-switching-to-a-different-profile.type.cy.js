import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfileName = `C402332 autotest mapping profile_${getRandomPostfix()}`;
    const actionProfileName = `C402332 autotest action profile_${getRandomPostfix()}`;
    const matchProfileName = `C402332 autotest match profile_${getRandomPostfix()}`;
    const jobProfileName = `C2332 autotest job profile ${getRandomPostfix()}`;

    before('Create test data and login', () => {
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

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C402332 Verify that any existing profile search is cleared when switching to a different profile type (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
        FieldMappingProfiles.search(mappingProfileName);
        FieldMappingProfileView.closeViewMode(mappingProfileName);
        FieldMappingProfiles.verifySearchResult(mappingProfileName);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.verifySearchFieldIsEmpty();
        ActionProfiles.search(actionProfileName);
        ActionProfiles.verifySearchResult(actionProfileName);

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.search(matchProfileName);
        MatchProfiles.verifySearchResult(matchProfileName);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.search(jobProfileName);
        JobProfiles.verifySearchResult(jobProfileName);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.verifySearchFieldIsEmpty();
        FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.verifySearchFieldIsEmpty();
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.verifySearchFieldIsEmpty();
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.verifySearchFieldIsEmpty();
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
      },
    );
  });
});
