import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TestTypes from '../../support/dictionary/testTypes';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ExportFile from '../../support/fragments/data-export/exportFile';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../support/fragments/topMenu';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: MARC file import with matching for 999 ff field', () => {
  // unique file name to upload
  const nameForMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
  const nameForExportedMarcFile = `C343343autotestFile${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C343343autotestFile${getRandomPostfix()}.csv`;
  const mappingProfileName = `autotestMappingProf${getRandomPostfix()}`;
  const matchProfileName = `autotestMatchProf${getRandomPostfix()}`;
  const actionProfileName = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const mappingProfileNameForExport = `autotestMappingProf${getRandomPostfix()}`;
  const actionProfileNameForExport = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileNameForExport = `autotestJobProf${getRandomPostfix()}`;

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    DataImport.checkUploadState();
  });

  afterEach(() => {
    DataImport.checkUploadState();
  });

  it('C343343 MARC file import with matching for 999 ff field (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create Field mapping profile for export
    const mappingProfileForExport = {
      name: mappingProfileNameForExport,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
      permanentLocation: '"Annex (KU/CC/DI/A)"',
    };
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createMappingProfile(mappingProfileForExport);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileNameForExport);

    // create Action profile for export and link it to Field mapping profile
    const actionProfileForExport = {
      typeValue : NewActionProfile.folioRecordTypeValue.instance,
      name: actionProfileNameForExport
    };
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfileForExport, mappingProfileForExport.name);
    ActionProfiles.checkActionProfilePresented(actionProfileNameForExport);

    // create job profile for export
    const jobProfileForExport = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileNameForExport
    };
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfileForExport, actionProfileForExport);
    JobProfiles.checkJobProfilePresented(jobProfileNameForExport);

    // upload a marc file for export
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    JobProfiles.searchJobProfileForImport(jobProfileNameForExport);
    JobProfiles.runImportFile(nameForMarcFile);
    Logs.openFileDetails(nameForMarcFile);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.instance);

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(hrId => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(hrId[0]);
        InventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);

        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        ExportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        cy.log('#####End Of Export#####');

        // create Match profile
        const matchProfile = {
          profileName: matchProfileName,
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
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        const mappingProfile = {
          name: mappingProfileName,
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
          update: true,
          permanentLocation: '"Annex (KU/CC/DI/A)"'
        };
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfile(mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

        // create Action profile and link it to Field mapping profile
        const actionProfile = {
          typeValue : NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileName,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
        };
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.createActionProfile(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfileName);

        // create Job profile
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: jobProfileName,
          acceptedType: NewJobProfile.acceptedDataType.marc
        };
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        JobProfiles.checkJobProfilePresented(jobProfileName);

        // upload the exported marc file with 999.f.f.s fields
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadExportedFile(nameForExportedMarcFile);
        JobProfiles.searchJobProfileForImport(jobProfileName);
        JobProfiles.runImportFile(nameForExportedMarcFile);
        Logs.openFileDetails(nameForExportedMarcFile);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);

        // get Instance HRID through API
        SearchInventory
          .getInstanceHRID()
          .then(id => {
            cy.visit(TopMenu.inventoryPath);
            SearchInventory.searchInstanceByHRID(id[0]);

            // ensure the fields created in Field mapping profile exists in inventory
            SearchInventory.checkInstanceDetails();

            // clean up generated profiles
            JobProfiles.deleteJobProfile(jobProfileName);
            JobProfiles.deleteJobProfile(jobProfileNameForExport);
            MatchProfiles.deleteMatchProfile(matchProfileName);
            ActionProfiles.deleteActionProfile(actionProfileName);
            ActionProfiles.deleteActionProfile(actionProfileNameForExport);
            FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
            FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileNameForExport);

            // delete created files in fixtures
            FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
            FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
          });
      });
  });
});
