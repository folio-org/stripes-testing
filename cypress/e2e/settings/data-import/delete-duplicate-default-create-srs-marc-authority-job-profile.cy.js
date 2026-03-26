import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const randomPostfix = getRandomPostfix();
    const defaultJobProfileName = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const defaultActionProfileName = 'Default - Create MARC Authority';

    const mappingProfile = {
      name: `AT_C367992_Update MARC Authority record_${randomPostfix}`,
    };
    const actionProfile = {
      name: `AT_C367992_Update MARC Authority record_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `AT_C367992_MARC Authority Match by 010 $a_${randomPostfix}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const duplicatedJobProfileName = `AT_C367992_Default - Create SRS MARC Authority (duplicated by user)_${randomPostfix}`;
    const duplicatedJobProfileDescription = `Duplicated job profile for creating MARC authority records. With comparing uploaded records_${randomPostfix}`;
    const editedJobProfileName = `AT_C367992_Not Default - Create SRS MARC Authority (duplicated and edited by user)_${randomPostfix}`;
    const successCreatedCalloutMessage = `The job profile "${duplicatedJobProfileName}" was successfully created`;
    const successUpdatedCalloutMessage = `The job profile "${editedJobProfileName}" was successfully updated`;
    const successDeletedCalloutMessage = `The job profile "${editedJobProfileName}" was successfully deleted`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfileResponse.body.id);
        },
      );
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(editedJobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C367992 Delete duplicate "Default - Create SRS MARC Authority" job profile (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C367992'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password);
          // #1 Navigate to Settings > Data import > Job profiles
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
        });
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);

        // #1 Click on "Default - Create SRS MARC Authority" job profile
        JobProfiles.search(defaultJobProfileName);
        JobProfiles.openJobProfileView(defaultJobProfileName);
        JobProfileView.verifyJobProfileOpened();

        // #2-3 Click on the "Actions" button - verify Delete is disabled, Edit and Duplicate are enabled
        JobProfileView.checkActionsMenuOptionsEnabled({
          editEnabled: true,
          duplicateEnabled: true,
          deleteEnabled: false,
        });

        // #4 Click on "Duplicate"
        JobProfileView.duplicate();

        // #5 Update Name, Description, and unlink the Action profile
        NewJobProfile.fillProfileName(duplicatedJobProfileName);
        NewJobProfile.fillDescription(duplicatedJobProfileDescription);
        JobProfileEdit.unlinkActionProfile(0);

        // #6 Inside Overview: Add Match profile, then for Matches add Action profile
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);

        // #7 Click "Save as profile & Close"
        NewJobProfile.saveAndClose();
        NewJobProfile.checkCalloutMessage(successCreatedCalloutMessage);
        JobProfileView.verifyJobProfileOpened();

        // #8 Click on "Actions" - verify all options are enabled
        JobProfileView.checkActionsMenuOptionsEnabled({
          editEnabled: true,
          duplicateEnabled: true,
          deleteEnabled: true,
        });

        // #9 Click on "Edit"
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(duplicatedJobProfileName);

        // #10 Update Name and add Non-Matches Action "Default - Create SRS MARC Authority"
        JobProfileEdit.changeProfileName(editedJobProfileName);
        JobProfileEdit.linkActionProfileForNonMatches(defaultActionProfileName);

        // #11 Click "Save as profile & Close"
        JobProfileEdit.saveAndClose();
        NewJobProfile.checkCalloutMessage(successUpdatedCalloutMessage);
        JobProfileView.verifyJobProfileOpened();

        // #12 Click on "Actions" - verify all options are enabled
        JobProfileView.checkActionsMenuOptionsEnabled({
          editEnabled: true,
          duplicateEnabled: true,
          deleteEnabled: true,
        });

        // #13 Click "Delete" and confirm deletion
        JobProfileView.delete();
        NewJobProfile.checkCalloutMessage(successDeletedCalloutMessage);
        JobProfiles.verifyJobProfileShownInList(editedJobProfileName, false);

        // #14 Verify original default job profile is unchanged
        JobProfiles.search(defaultJobProfileName);
        JobProfiles.openJobProfileView(defaultJobProfileName);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobProfileName(defaultJobProfileName);
      },
    );
  });
});
