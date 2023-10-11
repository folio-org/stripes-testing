import getRandomPostfix from '../../../support/utils/stringTools';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import ConfirmDelete from '../../../support/fragments/data_import/match_profiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/data_import/match_profiles/modals/exceptionDelete';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfileToDelete = {
      profileName: `C2346 autotest action profile to delete ${getRandomStringCode(8)}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const profile = {
      createJobProfile: `autotest jobProfileForCreate.${getRandomPostfix()}`,
      createActionProfile: `autotest actionProfileForCreate${getRandomPostfix()}`,
      createMappingProfile: `autotest mappingProfileForCreate${getRandomPostfix()}`,
      createMatchProfile: `autotest matchProfileForCreate${getRandomPostfix()}`,
    };

    const calloutMessage = `The match profile "${matchProfileToDelete.profileName}" was successfully deleted`;

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        NewFieldMappingProfile.createMappingProfileViaApi(profile.createMappingProfile).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              profile.createActionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              NewMatchProfile.createMatchProfileViaApi(profile.createMatchProfile).then(
                (matchProfileResponse) => {
                  NewJobProfile.createJobProfileViaApi(
                    profile.createJobProfile,
                    matchProfileResponse.body.id,
                    actionProfileResponse.body.id,
                  );
                },
              );
            });

            cy.login(user.username, user.password);
            cy.visit(SettingsMenu.matchProfilePath);
          },
        );
      });
      MatchProfiles.createMatchProfile(matchProfileToDelete);
      MatchProfileView.closeViewMode();
    });

    after('Delete test data', () => {
      JobProfiles.deleteJobProfile(profile.createJobProfile);
      ActionProfiles.deleteActionProfile(profile.createActionProfile);
      MatchProfiles.deleteMatchProfile(profile.createMatchProfile);
      FieldMappingProfileView.deleteViaApi(profile.createMappingProfile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2341 Delete an existing match profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        MatchProfiles.search(profile.createMatchProfile);
        MatchProfiles.selectMatchProfileFromList(profile.createMatchProfile);
        MatchProfileView.delete();
        ConfirmDelete.delete();
        ExceptionDelete.verifyExceptionMessage();
        ExceptionDelete.closeException();
        MatchProfiles.search(matchProfileToDelete.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfileToDelete.profileName);
        MatchProfileView.delete();
        ConfirmDelete.delete();
        MatchProfiles.checkCalloutMessage(calloutMessage);
        MatchProfiles.search(matchProfileToDelete.profileName);
        MatchProfiles.verifyMatchProfileAbsent();
      },
    );
  });
});
