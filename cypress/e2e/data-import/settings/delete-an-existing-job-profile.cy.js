import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Settings', () => {
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C2334 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const calloutMessage = `The job profile "${jobProfile.profileName}" was successfully deleted`;

    before('create test data', () => {
      cy.loginAsAdmin();
      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.saveAndClose();
      InteractorsTools.closeCalloutMessage(calloutMessage);
      JobProfiles.closeJobProfile(jobProfile.profileName);
    });

    it(
      'C2334 Delete an existing job profile (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.delete();
        NewJobProfile.checkCalloutMessage(calloutMessage);
        JobProfiles.verifyJobProfileAbsent();
      },
    );
  });
});
