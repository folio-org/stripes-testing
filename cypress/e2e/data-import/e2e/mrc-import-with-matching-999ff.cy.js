import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TestTypes from '../../../support/dictionary/testTypes';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../../support/fragments/topMenu';
import DevTeams from '../../../support/dictionary/devTeams';
import { LOCALION_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';

describe('ui-data-import', () => {
  // unique file name to upload
  const nameForMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
  const nameForExportedMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C343343autotestFile${getRandomPostfix()}.csv`;

  const mappingProfileForExport = {
    name: `autotestMappingProf${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    permanentLocation: `"${LOCALION_NAMES.ANNEX}"`,
  };
  const actionProfileForExport = {
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    name: `autotestActionProf${getRandomPostfix()}`
  };
  const jobProfileForExport = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autotestJobProf${getRandomPostfix()}`
  };
  const mappingProfile = {
    name: `autotestMappingProf${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    update: true,
    permanentLocation: `"${LOCALION_NAMES.ANNEX}"`
  };
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    name: `autotestActionProf${getRandomPostfix()}`,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const matchProfile = {
    profileName: `autotestMatchProf${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's'
    },
    existingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 's'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'MARC_BIBLIOGRAPHIC'
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autotestJobProf${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc
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
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileForExport.name);
    // delete created files in fixtures
    FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });

  it('C343343 MARC file import with matching for 999 ff field (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
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
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfileForExport, actionProfileForExport.name);
    JobProfiles.checkJobProfilePresented(jobProfileForExport.profileName);

    // upload a marc file for export
    cy.visit(TopMenu.dataImportPath);
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    JobProfiles.searchJobProfileForImport(jobProfileForExport.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameForMarcFile);
    Logs.openFileDetails(nameForMarcFile);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);
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
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile.name, matchProfile.profileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload the exported marc file with 999.f.f.s fields
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameForExportedMarcFile);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForExportedMarcFile);
        Logs.openFileDetails(nameForExportedMarcFile);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance);

        // get Instance HRID through API
        InventorySearchAndFilter.getInstanceHRID()
          .then(id => {
            cy.visit(TopMenu.inventoryPath);
            InventorySearchAndFilter.searchInstanceByHRID(id[0]);

            // ensure the fields created in Field mapping profile exists in inventory
            InventorySearchAndFilter.checkInstanceDetails();
          });
      });
  });
});
