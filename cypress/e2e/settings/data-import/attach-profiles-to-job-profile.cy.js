import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfMatchProfiles = [
      {
        profileName: `C11139 autotest match profile1 ${getRandomPostfix()}`,
      },
      {
        profileName: `C11139 autotest match profile2 ${getRandomPostfix()}`,
      },
    ];
    const collectionOfActionProfiles = [
      {
        name: `C11139 autotest action profile1 ${getRandomPostfix()}`,
      },
      {
        name: `C11139 autotest action profile2 ${getRandomPostfix()}`,
      },
      {
        name: `C11139 autotest action profile3 ${getRandomPostfix()}`,
      },
    ];
    const mappingProfile = {
      name: `C11139 mapping profile ${getRandomPostfix()}`,
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
            collectionOfActionProfiles.forEach((profile) => {
              NewActionProfile.createActionProfileViaApi(
                profile.name,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                profile.id = actionProfileResponse.body.id;
              });
            });
          },
        );

        // create 2 match profile
        collectionOfMatchProfiles.forEach((profile) => {
          NewMatchProfile.createMatchProfileViaApi(profile.profileName).then(
            (matchProfileResponse) => {
              profile.id = matchProfileResponse.body.id;
            },
          );
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMatchProfiles.forEach((profile) => SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.profileName));
        collectionOfActionProfiles.forEach((profile) => SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name));
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C11139 Attaching match and action profiles to a job profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].profileName);
        NewJobProfile.linkMatchProfileForMatches(collectionOfMatchProfiles[1].profileName);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[0].name, 2);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[1].name, 2);
        NewJobProfile.linkActionProfileForNonMatches(collectionOfActionProfiles[2].name, 3);
        NewJobProfile.saveAndClose();
        cy.wait(3000);
        JobProfileView.verifyLinkedProfiles(
          [
            collectionOfMatchProfiles[0].profileName,
            collectionOfMatchProfiles[1].profileName,
            collectionOfActionProfiles[0].name,
            collectionOfActionProfiles[1].name,
            collectionOfActionProfiles[2].name,
          ],
          5,
        );
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[0].id);
        ActionProfileView.verifyActionProfileTitleName(collectionOfActionProfiles[0].name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[1].id);
        ActionProfileView.verifyActionProfileTitleName(collectionOfActionProfiles[1].name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[2].id);
        ActionProfileView.verifyActionProfileTitleName(collectionOfActionProfiles[2].name);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfMatchProfiles[0].id);
        MatchProfileView.verifyMatchProfileTitleName(collectionOfMatchProfiles[0].profileName);
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfMatchProfiles[1].id);
        MatchProfileView.verifyMatchProfileTitleName(collectionOfMatchProfiles[1].profileName);
      },
    );
  });
});
