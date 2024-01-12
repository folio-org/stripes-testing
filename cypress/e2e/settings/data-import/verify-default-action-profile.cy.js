import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {};
    const defaultJobProfileName = 'Default - Create SRS MARC Authority';
    const defaultActionProfileName = 'Default - Create MARC Authority';
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C422235 autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        // #1 Go to "Settings" application -> Select "Data import" setting -> Select "Job profiles"
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      // Returning Default job profile to its original properties
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.search(defaultJobProfileName);
      JobProfiles.select(defaultJobProfileName);
      JobProfileView.edit();
      JobProfileEdit.verifyScreenName(defaultJobProfileName);
      NewJobProfile.linkActionProfileByName(defaultActionProfileName);
      JobProfileEdit.saveAndClose();
      JobProfileView.verifyLinkedProfiles([defaultActionProfileName], 1);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C422235 Verify that Default Create Instance action profile does NOT link to the wrong job profile (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // #2 Find and select "Default - Create SRS MARC Authority" job profile ->
        JobProfiles.search(defaultJobProfileName);
        JobProfiles.select(defaultJobProfileName);
        JobProfileView.edit();
        JobProfileEdit.unlinkActionsProfile(0);
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
