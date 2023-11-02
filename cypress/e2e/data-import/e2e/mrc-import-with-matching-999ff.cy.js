import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    // unique file name to upload
    const nameForMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C343343autotestFile${getRandomPostfix()}.csv`;

    const mappingProfileForExport = {
      name: `autotestMappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfileForExport = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `autotestActionProf${getRandomPostfix()}`,
    };
    const jobProfileForExport = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
    };
    const mappingProfile = {
      name: `autotestMappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `autotestActionProf${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `autotestMatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.loginAsAdmin();
      cy.getAdminToken();
    });

    after('delete test data', () => {
      // clean up generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      JobProfiles.deleteJobProfile(jobProfileForExport.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      ActionProfiles.deleteActionProfile(actionProfileForExport.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfileForExport.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    });

    it(
      'C343343 MARC file import with matching for 999 ff field (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // create Field mapping profile for export
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfile(mappingProfileForExport);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileForExport.name);

        // create Action profile for export and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileForExport, mappingProfileForExport.name);
        ActionProfiles.checkActionProfilePresented(actionProfileForExport.name);

        // create job profile for export
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileForExport,
          actionProfileForExport.name,
        );
        JobProfiles.checkJobProfilePresented(jobProfileForExport.profileName);

        // upload a marc file for export
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
        JobProfiles.search(jobProfileForExport.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForMarcFile);
        Logs.openFileDetails(nameForMarcFile);
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.instance,
        );

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHRID = initialInstanceHrId;

          // download .csv file
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.saveUUIDs();
          ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          cy.visit(TopMenu.dataExportPath);

          // download exported marc file
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
          ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));

          cy.log('#####End Of Export#####');

          // create Match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);

          // create Field mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.createMappingProfile(mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          // create Action profile and link it to Field mapping profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(actionProfile, mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload the exported marc file with 999.f.f.s fields
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(nameForExportedMarcFile);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameForExportedMarcFile);
          Logs.openFileDetails(nameForExportedMarcFile);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.instance,
          );

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InstanceRecordView.verifyInstancePaneExists();
          // ensure the fields created in Field mapping profile exists in inventory
          InventorySearchAndFilter.checkInstanceDetails();
        });
      },
    );
  });
});
