import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile1 = {
      profileName: `C11139 autotest match profile ${getRandomPostfix()}`,
    };
    const matchProfile2 = {
      profileName: `C11139 autotest match profile ${getRandomPostfix()}`,
    };
    const actionProfile1 = {
      name: `C11139 autotest action profile1 ${getRandomPostfix()}`,
    };
    const actionProfile2 = {
      name: `C11139 autotest action profile2 ${getRandomPostfix()}`,
    };
    const actionProfile3 = {
      name: `C11139 autotest action profile3 ${getRandomPostfix()}`,
    };
    const mappingProfile = {
      name: `C11116 mapping profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C11139 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });

        // create 3 action profiles linked to mapping profile
        NewFieldMappingProfile.createMappingProfileViaApi(mappingProfile.name).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              actionProfile1.name,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfile1.id = actionProfileResponse.body.id;
            });
            NewActionProfile.createActionProfileViaApi(
              actionProfile2.name,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfile2.id = actionProfileResponse.body.id;
            });
            NewActionProfile.createActionProfileViaApi(
              actionProfile3.name,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfile3.id = actionProfileResponse.body.id;
            });
          },
        );

        // create 2 match profile
        NewMatchProfile.createMatchProfileViaApi(matchProfile1.profileName).then(
          (matchProfileResponse) => {
            matchProfile1.id = matchProfileResponse.body.id;
          },
        );
        NewMatchProfile.createMatchProfileViaApi(matchProfile2.profileName).then(
          (matchProfileResponse) => {
            matchProfile2.id = matchProfileResponse.body.id;
          },
        );
      });
    });

    after('Delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile1.name);
      ActionProfiles.deleteActionProfile(actionProfile2.name);
      ActionProfiles.deleteActionProfile(actionProfile3.name);
      MatchProfiles.deleteMatchProfile(matchProfile1.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile2.profileName);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C11139 Attaching match and action profiles to a job profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile1.profileName);
        NewJobProfile.linkMatchProfileForMatches(matchProfile2.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile1.name, 2);
        NewJobProfile.linkActionProfileForMatches(actionProfile2.name, 2);
        NewJobProfile.linkActionProfileForNonMatches(actionProfile3.name, 3);
        NewJobProfile.saveAndClose();
        JobProfileView.verifyLinkedProfiles(
          [
            matchProfile1.profileName,
            matchProfile2.profileName,
            actionProfile1.name,
            actionProfile2.name,
            actionProfile3.name,
          ],
          5,
        );
        JobProfileView.openLinkedProfileById(actionProfile1.id);
        ActionProfileView.verifyActionProfileTitleName(actionProfile1.name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(actionProfile2.id);
        ActionProfileView.verifyActionProfileTitleName(actionProfile2.name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(actionProfile3.id);
        ActionProfileView.verifyActionProfileTitleName(actionProfile3.name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(matchProfile1.id);
        MatchProfileView.verifyMatchProfileTitleName(matchProfile1.profileName);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(matchProfile2.id);
        MatchProfileView.verifyMatchProfileTitleName(matchProfile2.profileName);
      },
    );
  });
});
