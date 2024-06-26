import { ACCEPTED_DATA_TYPE_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {};
    const defaultJobProfileName = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const newJobProfileName = `C422235 autoTestJobProf.${getRandomPostfix()}`;
    const defaultActionProfileName = 'Default - Create instance';
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C422235 autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Job profiles"
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
        JobProfiles.search(defaultJobProfileName);
        JobProfileView.duplicate();
        cy.wait(1500);
        NewJobProfile.fillProfileName(newJobProfileName);
        cy.wait(1500);
        NewJobProfile.saveAndClose();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C422235 Verify that Default Create Instance action profile does NOT link to the wrong job profile (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // #2 Find and select "Default - Create SRS MARC Authority" job profile ->
        JobProfiles.search(newJobProfileName);
        JobProfileView.edit();
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyNoLinkedProfiles();
        // #3-4 Create new job profile, link to default action profile, and save
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, defaultActionProfileName);
        JobProfiles.checkCalloutMessage('Record updated:');
        JobProfileView.verifyLinkedProfiles([defaultActionProfileName], 1);
      },
    );
  });
});
