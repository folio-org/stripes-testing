import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';

describe('Settings', () => {
  const testData = {};

  const actionProfiles = [
    {
      name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
    },
    {
      name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
    },
    {
      name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
    },
  ];
  const mappingProfile = {
    name: `C423404 mapping profile ${getRandomPostfix()}`,
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C423404 autoTestJobProf.${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
      testData.user = userProperties;

      // create 3 action profiles linked to mapping profile
      NewFieldMappingProfile.createMappingProfileViaApi(mappingProfile.name).then(
        (mappingProfileResponse) => {
          actionProfiles.forEach((profile) => {
            NewActionProfile.createActionProfileViaApi(
              profile.name,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              profile.id = actionProfileResponse.body.id;
            });
          });
        },
      );

      // #1 Go to **Settings** > **Data import** > **Job profiles**
      cy.login(userProperties.username, userProperties.password, {
        path: SettingsMenu.jobProfilePath,
        waiter: JobProfiles.waitLoadingList,
      });
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.user.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    actionProfiles.forEach((profile) => {
      ActionProfiles.deleteActionProfile(profile.name);
    });
  });

  it(
    'C423404 Check linking/unlinking action profiles to job profiles (folijet) (TaaS)',
    { tags: ['extendedPath', 'folijet'] },
    () => {
      // #2-3 Create a new job profile by clicking Actions/New job profile -> Give the job profile a name -> Accepted Data type = MARC
      JobProfiles.createJobProfile(jobProfile);
      // Add three action profiles to the job profile
      actionProfiles.forEach((profile) => {
        NewJobProfile.linkActionProfile(profile);
      });
      JobProfileEdit.verifyLinkedProfiles(
        [actionProfiles[0].name, actionProfiles[1].name, actionProfiles[2].name],
        3,
      );
      // #4 Save the new job profile
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);
      // #5 Edit the job profile by going to Actions/Edit
      JobProfileView.edit();
      JobProfileEdit.verifyScreenName(jobProfile.profileName);
      // #6 Delete the second action profile from the job profile
      JobProfileEdit.unlinkActionsProfile(1);
      JobProfileEdit.verifyLinkedProfiles([actionProfiles[0].name, actionProfiles[2].name], 2);
      // #7 Delete the first action profile from the job profile
      JobProfileEdit.unlinkActionsProfile(0);
      JobProfileEdit.verifyLinkedProfiles([actionProfiles[2].name], 1);
      // #8 Save the edited job profile
      JobProfileEdit.saveAndClose();
      JobProfileView.verifyLinkedProfiles([actionProfiles[2].name], 1);
    },
  );
});
