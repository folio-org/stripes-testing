import {
  ACCEPTED_DATA_TYPE_NAMES,
  DEFAULT_ACTION_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
} from '../../../support/constants';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const matchProfileName = `AT_C1453731_MatchProfile_${randomPostfix}`;
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C1453731_JobProfile_${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create match profile and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
        profileName: matchProfileName,
        incomingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: '',
        },
        existingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      });

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [Capabilities.settingsEnabled],
          [CapabilitySets.uiDataImportSettingsManage],
        );

        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      MatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
    });

    it(
      'C1453731 Job profile with Delete MARC Authority action correctly placed in for-matches branch is accepted (promin)',
      { tags: ['criticalPath', 'promin', 'C1453731'] },
      () => {
        // Step 1: New job profile > Name/Accepted data type=MARC > add the match profile to
        // Overview > add "Default - Delete MARC Authority records" action under its for-matches branch
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchAndActionProfiles(
          matchProfileName,
          DEFAULT_ACTION_PROFILE_NAMES.DELETE_AUTHORITY,
        );

        // Step 2: Save as profile & Close - success toast, job profile visible in the list
        NewJobProfile.saveAndClose();
        JobProfileEdit.verifyCalloutMessage();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
      },
    );
  });
});
