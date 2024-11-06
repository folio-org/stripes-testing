import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
} from '../../../support/constants';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const defaultJobProfileName = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const newDefaultJobProfileName = `${
      DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY
    }${getRandomPostfix()}`;
    const defaultActionProfileName = 'Default - Create MARC Authority';
    const matchProfile = {
      profileName: `C422093 Match Profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };

    before('Login', () => {
      cy.loginAsAdmin();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(newDefaultJobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
    });

    it(
      'C422093 Verify removal of default action profile from job profile: Default - Create SRS MARC Authority (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet', 'C422093'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Match Profile"
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        // #2 Find a match profile for MARC Authority records where incoming 010$a is being matched to existing 010$a.
        MatchProfiles.createMatchProfile(matchProfile);
        // #3 Go to Job profiles, and search for Job profile called "Default - Create SRS MARC Authority". When found, click on it
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        // need to create the same job profile as default
        JobProfiles.search(defaultJobProfileName);
        JobProfiles.select(defaultJobProfileName);
        JobProfileView.duplicate();
        NewJobProfile.fillProfileName(newDefaultJobProfileName);
        cy.wait(1500);
        NewJobProfile.saveAndClose();
        cy.wait(1500);
        // #4 Click on the "Actions" button -> Select "Edit"
        JobProfileView.edit();
        // #5 Update the profile
        JobProfileEdit.unlinkActionProfile(0);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForNonMatches(defaultActionProfileName);
        // Click on "Save as profile & Close"
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfilesForNonMatches([defaultActionProfileName], 1);
      },
    );
  });
});
