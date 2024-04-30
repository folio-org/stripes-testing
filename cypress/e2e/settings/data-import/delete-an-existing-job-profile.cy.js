import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const jobProfileName = `C2334 autotest job profile ${getRandomPostfix()}`;
    const calloutMessage = `The job profile "${jobProfileName}" was successfully deleted`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewJobProfile.createJobProfileWithoutLinkedProfilesViaApi(jobProfileName);

      cy.loginAsAdmin();
      cy.visit(SettingsMenu.jobProfilePath);
    });

    it(
      'C2334 Delete an existing job profile (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        JobProfiles.search(jobProfileName);
        JobProfileView.delete();
        NewJobProfile.checkCalloutMessage(calloutMessage);
        JobProfiles.verifyJobProfileAbsent();
      },
    );
  });
});
