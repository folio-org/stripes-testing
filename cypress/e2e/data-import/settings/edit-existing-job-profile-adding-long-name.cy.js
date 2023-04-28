import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';

describe('ui-data-import', () => {
  const jobProfileName = `C2332 autotest job profile ${getRandomPostfix()}`;
  const jobProfileLongName = `C2332_autotest_job_profile_long_name_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}`;
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C2332 autotest job profile ${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test data', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    // create Job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.saveAndClose();
    InteractorsTools.closeCalloutMessage();
    JobProfiles.closeJobProfile(jobProfile.profileName);
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileLongName);
  });

  it('C2332 Edit an existing job profile by adding a long name (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    JobProfiles.checkListOfExistingProfilesIsDisplayed();
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfileView.edit();
    JobProfileEdit.verifyScreenName(jobProfile.profileName);
    JobProfileEdit.changeProfileName(jobProfileLongName);
    JobProfileEdit.saveAndClose();
    JobProfileView.verifyJobProfileOpened();
    JobProfileView.verifyJobProfileName(jobProfileLongName);
    JobProfiles.checkCalloutMessage(jobProfileLongName);
  });
});
