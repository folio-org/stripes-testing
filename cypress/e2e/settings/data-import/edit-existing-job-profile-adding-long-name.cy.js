import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const jobProfileLongName = `C2332_autotest_job_profile_long_name_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}`;
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C2332 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const calloutMessage = `The job profile "${jobProfileLongName}" was successfully updated`;

    before('Create test data and login', () => {
      cy.loginAsAdmin();

      // create Job profiles
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.saveAndClose();
      InteractorsTools.closeCalloutMessage();
      JobProfiles.closeJobProfile(jobProfile.profileName);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileLongName);
    });

    it(
      'C2332 Edit an existing job profile by adding a long name (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile.profileName);
        JobProfileEdit.changeProfileName(jobProfileLongName);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(jobProfileLongName);
        JobProfiles.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
