import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';

describe('data-import', () => {
  describe('Settings', () => {
    const defaultJobProfileName = 'Default - Create SRS MARC Authority';
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
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin();
    });

    after('Delete test data', () => {
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.search(defaultJobProfileName);
      JobProfiles.select(defaultJobProfileName);
      JobProfileView.edit();
      JobProfileEdit.verifyScreenName(defaultJobProfileName);
      JobProfileEdit.unlinkActionsProfile(0);
      NewJobProfile.linkActionProfileByName(defaultActionProfileName);
      JobProfileEdit.saveAndClose();
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
    });

    it(
      'C422093 Verify removal of default action profile from job profile: Default - Create SRS MARC Authority (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Match Profile"
        cy.visit(SettingsMenu.matchProfilePath);
        // #2 Find a match profile for MARC Authority records where incoming 010$a is being matched to existing 010$a.
        MatchProfiles.createMatchProfile(matchProfile);
        // #3 Go to Job profiles, and search for Job profile called "Default - Create SRS MARC Authority". When found, click on it
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.search(defaultJobProfileName);
        JobProfiles.select(defaultJobProfileName);
        // #4 Click on the "Actions" button -> Select "Edit"
        JobProfileView.edit();
        // #5 Update the profile
        JobProfileEdit.unlinkActionsProfile(0);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForNonMatches(defaultActionProfileName);
        // Click on "Save as profile & Close"
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfilesNonMatches([defaultActionProfileName], 1);
      },
    );
  });
});
