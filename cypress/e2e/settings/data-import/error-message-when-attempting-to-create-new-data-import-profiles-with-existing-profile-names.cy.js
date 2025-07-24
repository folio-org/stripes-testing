import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      actionProfile: 'Default - Create instance',
    };
    const matchProfile = {
      name: 'Inventory Single Record - Default match for no SRS record',
      description:
        'Matches the Instance UUID from the 999 ff $i in the incoming MARC record to the UUID of the existing Instance record',
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: 'Default - Create instance',
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: 'Default - Create instance',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'HOLDINGS',
      description:
        "This field mapping profile is used with FOLIO's default job profile for creating Inventory Instances and SRS MARC Bibliographic records. It can be edited, duplicated, deleted, or linked to additional action profiles.",
    };

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C404370 Verify the error message when attempting to create new Data Import profiles with existing profile names (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C404370'] },
      () => {
        const jobProfileErrorMessage =
          "New record not created: Job profile 'Default - Create instance and SRS MARC Bib' already exists";
        const matchProfileErrorMessage = `New record not created: Match profile '${matchProfile.name}' already exists`;
        const actionProfileErrorMessage = `New record not created: Action profile '${actionProfile.name}' already exists`;
        const mappingProfileErrorMessage = `New record not created: The field mapping profile '${mappingProfile.name}' already exists`;

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(jobProfile.actionProfile);
        NewJobProfile.saveAndClose();
        NewJobProfile.checkPreviouslyPopulatedDataIsDisplayed(jobProfile, jobProfile.actionProfile);
        NewJobProfile.checkCalloutMessage(jobProfileErrorMessage);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.search(matchProfile.name);
        MatchProfileView.duplicate();
        NewMatchProfile.verifyNewMatchProfileFormIsOpened();
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.fillExistingRecordSections(matchProfile);
        NewMatchProfile.saveAndClose();
        NewMatchProfile.verifyPreviouslyPopulatedDataIsDisplayed(
          matchProfile,
          'MARC Bibliographic',
        );
        NewMatchProfile.checkCalloutMessage(matchProfileErrorMessage);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.search(actionProfile.name);
        SettingsActionProfiles.selectActionProfileFromList(actionProfile.name);
        ActionProfileView.duplicate();
        NewActionProfile.chooseAction(actionProfile.action);
        NewActionProfile.saveProfile();
        NewActionProfile.verifyPreviouslyCreatedDataIsDisplayed(actionProfile);
        NewActionProfile.verifyCalloutMessage(actionProfileErrorMessage);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(mappingProfile.name);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.fillFolioRecordType(mappingProfile);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        NewFieldMappingProfile.checkCalloutMessage(mappingProfileErrorMessage);
      },
    );
  });
});
