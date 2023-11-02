import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const marcFieldProtected = ['507', '920'];
    const marcFieldProtectionId = [];
    let instanceHrid = null;

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
    const nameMarcFileForCreate = `C17017 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17017 protectedFields.${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C17017 updatedProtectedFields.${getRandomPostfix()}.mrc`;
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
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    const matchProfile = {
      profileName: `C17017 autotest MatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };

    const jobProfileUpdate = {
      profileName: `C17017 autotest update JobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    beforeEach('create test data', () => {
      cy.loginAsAdmin();
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
    });

    after('delete test data', () => {
      marcFieldProtectionId.forEach((field) => MarcFieldProtection.deleteViaApi(field));
      // delete profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      JobProfiles.deleteJobProfile(jobProfileUpdate.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      ActionProfiles.deleteActionProfile(actionProfileUpdate.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfileUpdate.name);
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${fileNameForUpdate}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
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
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        createInstanceMappingProfileForCreate(mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile.name);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC17017.mrc', nameMarcFileForCreate);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');
        FileDetails.openInstanceInInventory('Created');
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
        cy.visit(SettingsMenu.mappingProfilePath);
        createInstanceMappingProfileForUpdate(mappingProfileUpdate);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdate.name);

        // create action profile for update
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileUpdate, mappingProfileUpdate.name);
        ActionProfiles.checkActionProfilePresented(actionProfileUpdate.name);

        // create match profile for update
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileUpdate,
          actionProfileUpdate.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileUpdate.profileName);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
        JobProfiles.search(jobProfileUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        cy.wait(2000);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.openInstanceInInventory('Updated');
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
