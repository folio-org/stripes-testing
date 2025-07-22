import { APPLICATION_NAMES } from '../../../support/constants';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const jobProfileLongName = `C2332_autotest_job_profile_long_name_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}_${getRandomPostfix()}`;
    const mappingProfile = {
      name: `C2332 autotest mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C2332 autotest action profile ${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      profileName: `C2332 autotest job profile${getRandomPostfix()}`,
    };
    const calloutMessage = `The job profile "${jobProfileLongName}" was successfully updated`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfile.id = actionProfileResponse.body.id;

            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile.profileName,
              actionProfileResponse.body.id,
            );
          });
        },
      );

      cy.loginAsAdmin();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileLongName);
    });

    it(
      'C2332 Edit an existing job profile by adding a long name (folijet)',
      { tags: ['criticalPath', 'folijet', 'C2332'] },
      () => {
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.verifyJobProfileOpened();
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
