import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import: Edit an existing job profile by adding a long name', () => {
  const jobProfileName = `C2332 autotest job profile ${Helper.getRandomBarcode()}`;
  let user;
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create user', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    // create Job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkMatchAndTwoActionProfiles(matchProfile.profileName, marcBibActionProfile.name, instanceActionProfile.name);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileName);
  });

  it('C2332 Edit an existing job profile by adding a long name (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {

  });
});
