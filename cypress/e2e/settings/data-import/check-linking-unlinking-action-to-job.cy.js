import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};

    const actionProfiles = [
      {
        actionProfile: {
          name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C423404 autoTestActionProf.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
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

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        // create 3 action profiles linked to mapping profile
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            SettingsActionProfiles.forEach((profile) => {
              NewActionProfile.createActionProfileViaApi(
                profile.actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                profile.actionProfile.id = actionProfileResponse.body.id;
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
      cy.getAdminToken(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name);
        });
      });
    });

    it(
      'C423404 Check linking/unlinking action profiles to job profiles (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C423404'] },
      () => {
        // #2-3 Create a new job profile by clicking Actions/New job profile -> Give the job profile a name -> Accepted Data type = MARC
        JobProfiles.createJobProfile(jobProfile);
        // Add three action profiles to the job profile
        SettingsActionProfiles.forEach((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        JobProfileEdit.verifyLinkedProfiles(
          [
            actionProfiles[0].actionProfile.name,
            actionProfiles[1].actionProfile.name,
            actionProfiles[2].actionProfile.name,
          ],
          3,
        );
        // #4 Save the new job profile
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        // #5 Edit the job profile by going to Actions/Edit
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile.profileName);
        // #6 Delete the second action profile from the job profile
        JobProfileEdit.unlinkActionProfile(1);
        JobProfileEdit.verifyLinkedProfiles(
          [actionProfiles[0].actionProfile.name, actionProfiles[2].actionProfile.name],
          2,
        );
        // #7 Delete the first action profile from the job profile
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.verifyLinkedProfiles([actionProfiles[2].actionProfile.name], 1);
        // #8 Save the edited job profile
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles([actionProfiles[2].actionProfile.name], 1);
      },
    );
  });
});
