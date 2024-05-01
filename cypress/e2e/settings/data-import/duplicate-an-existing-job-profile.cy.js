import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C2333 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const description = `Description for job profile.${getRandomPostfix()}`;
    const jobProfileName = `C2333 newJobProfileName.${getRandomPostfix()}`;
    const failCalloutMessage = `Job profile '${jobProfile.profileName}' already exists`;
    const successCalloutMessage = `The job profile "${jobProfileName}" was successfully created`;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.saveAndClose();
        InteractorsTools.closeCalloutMessage();
        JobProfiles.closeJobProfile(jobProfile.profileName);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2333 Duplicate an existing job profile (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.duplicate();
        NewJobProfile.fillDescription(description);
        NewJobProfile.saveAndClose();
        NewJobProfile.checkCalloutMessage(failCalloutMessage);
        NewJobProfile.fillProfileName(jobProfileName);
        NewJobProfile.saveAndClose();
        NewJobProfile.checkCalloutMessage(successCalloutMessage);
        JobProfileView.verifyJobProfileOpened();
      },
    );
  });
});
