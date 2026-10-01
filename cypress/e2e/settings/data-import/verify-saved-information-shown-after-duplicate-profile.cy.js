import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();

    const testData = {
      fieldMappingProfile: {
        name: `AT_C367944_FieldMappingProfile_${randomPostfix}`,
      },
      actionProfile: {
        name: `AT_C367944_ActionProfile_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
      matchProfile: {
        profileName: `AT_C367944_MatchProfile_${randomPostfix}`,
        incomingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
        existingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      },
      jobProfile: {
        name: `AT_C367944_JobProfile_${randomPostfix}`,
      },
      duplicatedFieldMappingProfileName: `AT_C367944_FieldMappingProfileDup_${randomPostfix}`,
      duplicatedActionProfileName: `AT_C367944_ActionProfileDup_${randomPostfix}`,
      duplicatedMatchProfileName: `AT_C367944_MatchProfileDup_${randomPostfix}`,
      duplicatedJobProfileName: `AT_C367944_JobProfileDup_${randomPostfix}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(testData.fieldMappingProfile).then(
        (response) => {
          NewActionProfile.createActionProfileViaApi(testData.actionProfile, response.body.id).then(
            (actionResponse) => {
              NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                testData.jobProfile.name,
                actionResponse.body.id,
              );
              NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                testData.matchProfile,
              ).then((matchProfileResponse) => {
                testData.matchProfile.id = matchProfileResponse.body.id;
              });
            },
          );
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfile.name);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.duplicatedJobProfileName);
      cy.wait(500);
      ActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfile.name);
      ActionProfiles.deleteActionProfileByNameViaApi(testData.duplicatedActionProfileName);
      cy.wait(500);
      FieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.fieldMappingProfile.name);
      FieldMappingProfiles.deleteMappingProfileByNameViaApi(
        testData.duplicatedFieldMappingProfileName,
      );
      MatchProfiles.deleteMatchProfileByNameViaApi(testData.matchProfile.profileName);
      MatchProfiles.deleteMatchProfileByNameViaApi(testData.duplicatedMatchProfileName);
    });

    it(
      'C367944 Verify saved information is shown after duplicate the profile (promin)',
      { tags: ['extendedPath', 'promin', 'C367944'] },
      () => {
        // Step 1: Navigate to Field Mapping Profiles; search and open the source profile
        FieldMappingProfiles.search(testData.fieldMappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(testData.fieldMappingProfile.name);
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyMappingProfileTitleName(testData.fieldMappingProfile.name);
        cy.wait(2000);

        // Step 2: Duplicate; change name and save
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.addName(testData.duplicatedFieldMappingProfileName);
        NewFieldMappingProfile.save();

        // Step 3: Verify duplicated field mapping profile name is shown in view
        FieldMappingProfileView.verifyMappingProfileTitleName(
          testData.duplicatedFieldMappingProfileName,
        );

        // Step 4: Navigate to Action Profiles; search and open the source profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.search(testData.actionProfile.name);
        ActionProfiles.selectActionProfileFromList(testData.actionProfile.name);
        ActionProfileView.verifyActionProfileOpened();
        ActionProfileView.verifyActionProfileTitleName(testData.actionProfile.name);

        // Step 5: Duplicate; change name and save
        ActionProfileView.duplicate();
        NewActionProfile.fillName(testData.duplicatedActionProfileName);
        NewActionProfile.saveProfile();

        // Step 6: Verify duplicated action profile name is shown in view
        ActionProfileView.verifyActionProfileTitleName(testData.duplicatedActionProfileName);

        // Step 7: Navigate to Match Profiles; search and open the source profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.search(testData.matchProfile.profileName);
        MatchProfiles.selectMatchProfileFromList(testData.matchProfile.profileName);
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileTitleName(testData.matchProfile.profileName);

        // Step 8: Duplicate; change name and save
        MatchProfileView.duplicate();
        NewMatchProfile.fillName(testData.duplicatedMatchProfileName);
        NewMatchProfile.saveAndClose();

        // Step 9: Verify duplicated match profile name is shown in view
        MatchProfileView.verifyMatchProfileTitleName(testData.duplicatedMatchProfileName);

        // Step 10: Navigate to Job Profiles; search and open the source profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.search(testData.jobProfile.name);
        JobProfiles.selectJobProfile();
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(testData.jobProfile.name);

        // Step 11: Duplicate; change name and save
        JobProfileView.duplicate();
        NewJobProfile.fillProfileName(testData.duplicatedJobProfileName);
        NewJobProfile.saveAndClose();

        // Step 12: Verify duplicated job profile name is shown in view
        JobProfileView.verifyJobProfileName(testData.duplicatedJobProfileName);
      },
    );
  });
});
