import { APPLICATION_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
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
      name: `C2334 autotest mapping profile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const actionProfile = {
      name: `C2334 autotest action profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      profileName: `C2334 autotest job profile ${getRandomPostfix()}`,
    };
    const calloutMessage = `The job profile "${jobProfile.profileName}" was successfully deleted`;

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

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2334 Delete an existing job profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C2334'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.delete();
        NewJobProfile.checkCalloutMessage(calloutMessage);
        JobProfiles.verifyJobProfileAbsent();
      },
    );
  });
});
