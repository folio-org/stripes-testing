import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const testData = {
      instanceIds: [],
      marcFilePath: 'marcBibFileForC389589.mrc',
      fileName: `C389590 marcFileName${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,

      title: "101 things I wish I'd known when I started using hypnosis / Dabney Ewin.",
      errorMessage:
        'org.folio.processing.exceptions.MatchingException: Found multiple records matching specified conditions',
    };
    const marcFileNames = [
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
    ];
    const matchProfile = {
      profileName: `C389590 Updating SRS by 035 to OCLC number${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.identifierOCLC,
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C389590 Modifying 500 record${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          modifications: {
            action: 'Add',
            field: '500',
            ind1: '',
            ind2: '',
            subfield: 'a',
            data: `Test.${getRandomPostfix()}`,
          },
        },
        actionProfile: {
          name: `C389590 Modifying 500 record${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.MODIFY,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        },
      },
      {
        mappingProfile: {
          name: `C389590 Updating Instance with ADM note${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          adminNotes: 'Add this to existing',
          adminNote: `Test${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C389590 Updating Instance with ADM note${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C389590 Updating Instance by 035 OCLC record${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      marcFileNames.forEach((name) => {
        DataImport.uploadFileViaApi(
          testData.marcFilePath,
          name.fileName,
          testData.jobProfileToRun,
        ).then((response) => {
          testData.instanceIds.push(response[0].instance.id);
        });
      });

      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create mapping profile
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfiles[0].mappingProfile,
      );
      NewFieldMappingProfile.addFieldMappingsForMarc();
      NewFieldMappingProfile.fillModificationSectionWithAdd(
        collectionOfMappingAndActionProfiles[0].mappingProfile.modifications,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfiles[0].mappingProfile.name,
      );
      FieldMappingProfiles.checkMappingProfilePresented(
        collectionOfMappingAndActionProfiles[0].mappingProfile.name,
      );

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(
        collectionOfMappingAndActionProfiles[1].mappingProfile,
      );
      NewFieldMappingProfile.addAdministrativeNote(
        collectionOfMappingAndActionProfiles[1].mappingProfile.adminNote,
        9,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(
        collectionOfMappingAndActionProfiles[1].mappingProfile.name,
      );
      FieldMappingProfiles.checkMappingProfilePresented(
        collectionOfMappingAndActionProfiles[1].mappingProfile.name,
      );

      // craete match profile
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create action profiles
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkMatchProfile(matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(
        collectionOfMappingAndActionProfiles[1].actionProfile.name,
      );
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        testData.instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C389590 Verify the updated error message for multiple match on JSON screen for Instance: Case 2 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C389590'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFilePath, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.fileName);
        Logs.checkJobStatus(testData.fileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(testData.fileName);
        FileDetails.openJsonScreen(testData.title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openInstanceTab();
        JsonScreenView.verifyContentInTab(testData.errorMessage);
      },
    );
  });
});
