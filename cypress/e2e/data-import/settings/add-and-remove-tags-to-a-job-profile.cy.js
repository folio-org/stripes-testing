import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('data-import', () => {
  describe('Settings', () => {
    const tag = 'important';
    const newTag = uuid();
    const calloutMessage = 'New tag created';
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C2331 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.loginAsAdmin();
      cy.getAdminToken();

      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.closeJobProfile(jobProfile.profileName);
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
    });

    it(
      'C2331 Add tags to a job profile, then remove tags from it (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
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
