import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C2333 autotest mapping profile_${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C2333 instance action profile${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      profileName: `C2333 autotest job profile.${getRandomPostfix()}`,
    };
    const description = `Description for job profile.${getRandomPostfix()}`;
    const jobProfileName = `C2333 newJobProfileName.${getRandomPostfix()}`;
    const failCalloutMessage = `Job profile '${jobProfile.profileName}' already exists`;
    const successCalloutMessage = `The job profile "${jobProfileName}" was successfully created`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile.profileName,
              actionProfileResponse.body.id,
            );
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2333 Duplicate an existing job profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C2333'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
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
