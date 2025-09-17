import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
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
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const errorMessage =
      'Record: Incoming record could be a duplicate, incoming record generation should not be the same as matched record generation and the execution of job should be started after of creating the previous record generation';
    const title = 'Introductory Solid State Physics with MATLAB Applications';
    const firstFilePathForUpload = 'marcBibFileForC410708_file1.mrc';
    const secondFilePathForUpload = 'marcBibFileForC410708_file2.mrc';
    const firstFileName = `C410708 autotestFileName${getRandomPostfix()}.mrc`;
    const secondFileName = `C410708 autotestFileName${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C410708 autotestFileName${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const matchProfile = {
      profileName: `C410708 001 to Instance HRID_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const mappingProfile = {
      name: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      administrativeNote: `Test_${getRandomPostfix()}`,
    };

    const actionProfile = {
      name: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const jobProfile = {
      profileName: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (initialInstance) => {
            InventoryInstance.deleteInstanceViaApi(initialInstance.id);
          },
        );
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C410708 Verify that clear error message appears after importing a file with duplicate records in it (folijet)',
      { tags: ['criticalPath', 'folijet', 'C410708'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(firstFilePathForUpload, firstFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(firstFileName);
        Logs.checkJobStatus(firstFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstFileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          DataImport.editMarcFile(
            secondFilePathForUpload,
            editedMarcFileName,
            ['INSTANCEHRID', 'INSTANCEHRID'],
            [instanceHrid, instanceHrid],
          );
        });

        // create match profile for update
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(mappingProfile.administrativeNote, 9);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, secondFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(secondFileName);
        Logs.checkJobStatus(secondFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(secondFileName);
        FileDetails.openInstanceInInventoryByStatus(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.editMarcBibliographicRecord();
        InventoryEditMarcRecord.deleteField(18);
        InventoryEditMarcRecord.saveAndClose();
        cy.wait(1500);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();
        InstanceRecordView.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openJsonScreenByStatus(RECORD_STATUSES.NO_ACTION, title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessage);
      },
    );
  });
});
