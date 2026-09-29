import { ACCEPTED_DATA_TYPE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
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
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();

    // Round 1: link A, B, C; unlink B, A - only C should remain
    // Round 2 (after Edit): add D, E; unlink D, C - only E should remain (and A/B/C/D must NOT reappear)
    const buildActionProfile = (letter) => ({
      actionProfile: {
        name: `AT_C343273_ActionProfile_${letter}_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
    });
    const [profileA, profileB, profileC, profileD, profileE] = ['A', 'B', 'C', 'D', 'E'].map(
      buildActionProfile,
    );
    const allActionProfiles = [profileA, profileB, profileC, profileD, profileE];

    const mappingProfile = {
      name: `AT_C343273_MappingProfile_${randomPostfix}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C343273_JobProfile_${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      // Every action profile needs its own linked field mapping profile before it can be
      // attached to a job profile - reuse one mapping profile for all of them
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          allActionProfiles.forEach((profile) => {
            NewActionProfile.createActionProfileViaApi(
              profile.actionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              profile.actionProfile.id = actionProfileResponse.body.id;
            });
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        // Step 1: Settings > Data import > Job profiles
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      allActionProfiles.forEach((profile) => {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
      });
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C343273 Action profiles that have been unlinked from job profiles sometimes reappear (promin)',
      { tags: ['extendedPath', 'promin', 'C343273'] },
      () => {
        // Steps 2-3: New job profile, Name + Accepted data type = MARC, link A, B, C
        JobProfiles.createJobProfile(jobProfile);
        [profileA, profileB, profileC].forEach((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        JobProfileEdit.verifyLinkedProfiles(
          [profileA.actionProfile.name, profileB.actionProfile.name, profileC.actionProfile.name],
          3,
        );

        // Step 4: unlink B, then A - only C remains; save
        JobProfileEdit.unlinkActionProfile(1);
        JobProfileEdit.verifyLinkedProfiles(
          [profileA.actionProfile.name, profileC.actionProfile.name],
          2,
        );
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.verifyLinkedProfiles([profileC.actionProfile.name], 1);
        NewJobProfile.saveAndClose();

        // Step 5: job profile appears in the list
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // Step 6: detail view shows only C - A and B did not reappear
        JobProfileView.verifyLinkedProfiles([profileC.actionProfile.name], 1);

        // Step 7: Actions > Edit; add D, E (now C, D, E linked)
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile.profileName);
        [profileD, profileE].forEach((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        JobProfileEdit.verifyLinkedProfiles(
          [profileC.actionProfile.name, profileD.actionProfile.name, profileE.actionProfile.name],
          3,
        );

        // Remove most - unlink D, then C - only E remains; save
        JobProfileEdit.unlinkActionProfile(1);
        JobProfileEdit.verifyLinkedProfiles(
          [profileC.actionProfile.name, profileE.actionProfile.name],
          2,
        );
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.verifyLinkedProfiles([profileE.actionProfile.name], 1);
        JobProfileEdit.saveAndClose();

        // Steps 8-9: detail view shows only E - A, B, C and D did not reappear
        JobProfileView.verifyLinkedProfiles([profileE.actionProfile.name], 1);
      },
    );
  });
});
