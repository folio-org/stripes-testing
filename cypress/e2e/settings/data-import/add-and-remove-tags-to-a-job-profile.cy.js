import uuid from 'uuid';
import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const tag = 'important';
    const newTag = uuid();
    const calloutMessage = 'New tag created';
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C2331 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.loginAsAdmin();
      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.closeJobProfile(jobProfile.profileName);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
    });

    it(
      'C2331 Add tags to a job profile, then remove tags from it (folijet)',
      { tags: ['extendedPath', 'folijet', 'eurekaPhase1'] },
      () => {
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.addExistingTag(tag);
        JobProfileView.verifyAssignedTags(tag);

        JobProfileView.addNewTag(newTag);
        InteractorsTools.checkCalloutMessage(calloutMessage);
        JobProfileView.verifyAssignedTags(newTag, 2);

        JobProfileView.removeTag(tag);
        JobProfileView.verifyAssignedTagsIsAbsent(tag);
      },
    );
  });
});
