import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    const marcFieldProtected = ['507', '920'];
    const marcFieldProtectionId = [];
    let instanceHrid = null;
    let userId = null;

    // data from .mrc file
    const dataFromField001 = 'ocn894025734';
    const dataForField500 = 'Repeatable unprotected field';
    const dataForField507 = 'Non-repeatable protected field';
    const dataForField920 = 'This field should be protected';
    // data for changing .mrc file
    const updateDataForField500 = 'Repeatable unprotected field Updated';
    const updateDataForField507 = 'Non-repeatable protected field Updated';
    const updateDataForField920 =
      'The previous 920 should be retained, since it is protected and repeatable, and this new 920 added.';
    // unique file names
    const nameMarcFileForCreate = `C17017 autotestFile${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17017 protectedFields${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C17017 updatedProtectedFields${getRandomPostfix()}.mrc`;
    // profiles for create
    const mappingProfile = {
      name: `C17017 autotest MappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      name: `C17017 autotest ActionProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const jobProfile = {
      profileName: `C17017 autotest JobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    // profiles for update
    const mappingProfileUpdate = {
      name: `C17017 autotest update MappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };

    const actionProfileUpdate = {
      name: `C17017 autotest update ActionProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const matchProfile = {
      profileName: `C17017 autotest MatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };

    const jobProfileUpdate = {
      profileName: `C17017 autotest update JobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        marcFieldProtected.forEach((field) => {
          MarcFieldProtection.createViaApi({
            indicator1: '*',
            indicator2: '*',
            subfield: '*',
            data: '*',
            source: 'USER',
            field,
          }).then((resp) => {
            const id = resp.id;
            marcFieldProtectionId.push(id);
          });
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${fileNameForUpdate}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        marcFieldProtectionId.forEach((field) => MarcFieldProtection.deleteViaApi(field));
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileUpdate.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileUpdate.name);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    const createInstanceMappingProfileForCreate = (instanceMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
    };

    const createInstanceMappingProfileForUpdate = (instanceMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
      NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfile.instanceStatusTerm);
      NewFieldMappingProfile.addStatisticalCode(
        'ARL (Collection stats): books - Book, print (books)',
        8,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
    };

    it(
      'C17017 Check that field protection settings work properly during data import (folijet)',
      { tags: ['criticalPath', 'folijet', 'C17017'] },
      () => {
        // create mapping profile
        createInstanceMappingProfileForCreate(mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile.name);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC17017.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkJobStatus(nameMarcFileForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InstanceRecordView.waitLoading();
          InstanceRecordView.viewSource();
          InstanceRecordView.verifySrsMarcRecord();
          InventoryViewSource.verifyFieldInMARCBibSource('500', dataForField500);
          InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[0], dataForField507);
          InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[1], dataForField920);

          // change file using order number
          DataImport.editMarcFile(
            'marcFileForC17017.mrc',
            editedMarcFileName,
            [dataFromField001, dataForField500, dataForField507, dataForField920],
            [instanceHrid, updateDataForField500, updateDataForField507, updateDataForField920],
          );
        });

        // create mapping profile for update
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        createInstanceMappingProfileForUpdate(mappingProfileUpdate);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdate.name);

        // create action profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfileUpdate, mappingProfileUpdate.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfileUpdate.name);

        // create match profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);

        // create job profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileUpdate,
          actionProfileUpdate.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileUpdate.profileName);

        // upload a marc file for updating already created instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        cy.wait(2000);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.waitLoading();
        InstanceRecordView.viewSource();
        InstanceRecordView.verifySrsMarcRecord();
        InventoryViewSource.verifyFieldInMARCBibSource('500', dataForField500);
        InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[0], dataForField507);
        InventoryViewSource.verifyFieldInMARCBibSource(marcFieldProtected[1], dataForField920);
        InventoryViewSource.verifyFieldInMARCBibSource(
          marcFieldProtected[1],
          updateDataForField920,
        );
      },
    );
  });
});
