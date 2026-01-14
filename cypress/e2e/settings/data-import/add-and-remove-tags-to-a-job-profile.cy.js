import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../support/constants';
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
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const tag = 'important';
    const newTag = uuid();
    const calloutMessage = 'New tag created';
    const mappingProfile = {
      name: `C2331 autotest mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C2331 autotest action profile ${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      profileName: `C2331 autotest job profile${getRandomPostfix()}`,
    };

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
      cy.loginAsAdmin();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C2331 Add tags to a job profile, then remove tags from it (folijet)',
      { tags: ['extendedPath', 'folijet', 'C2331'] },
      () => {
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.search(jobProfile.profileName);
        JobProfileView.verifyJobProfileOpened();
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
