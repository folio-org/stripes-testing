import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import dataImport from '../../support/fragments/data_import/dataImport';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import topMenu from '../../support/fragments/topMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import logs from '../../support/fragments/data_import/logs';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import getRandomPostfix from '../../support/utils/stringTools';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import exportFile from '../../support/fragments/data-export/exportFile';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import testTypes from '../../support/dictionary/testTypes';

describe('ui-data-import: Test MARC-MARC matching for 001 field', () => {
  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    cy.visit(topMenu.dataImportPath);
  });

  it('C17044: MARC-MARC matching for 001 field', { tags: testTypes.smoke }, () => {
    // unique file name to upload
    const nameForMarcFile = `autoTestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `autoTestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autoTestFile${getRandomPostfix()}.csv`;

    // unique name for profiles
    const matchProfileName = `autoTestMatchProf.${getRandomPostfix()}`;
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // upload a marc file for export
    dataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    jobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    jobProfiles.runImportFile(nameForMarcFile);
    logs.openJobProfile(nameForMarcFile);
    logs.checkIsInstanceCreated();

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        cy.visit(topMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(topMenu.dataExportPath);

        // download exported marc file
        exportFile.uploadFile(nameForCSVFile);
        exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        ExportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        // create Match profile
        const matchProfile = {
          profileName: matchProfileName,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC'
        };

        SettingsDataImport.goToMatchProfiles();

        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        const mappingProfile = {
          name: mappingProfileName,
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
          update: true
        };

        SettingsDataImport.goToMappingProfiles();
        FieldMappingProfiles.createMappingProfile(mappingProfile);

        // create Action profile and link it to Field mapping profile
        const actionProfile = {
          typeValue : NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileName,
          action: 'Update (all record types except Orders)',
        };
        SettingsDataImport.goToActionProfiles();
        ActionProfiles.createActionProfile(actionProfile, mappingProfile);
        ActionProfiles.checkActionProfilePresented(actionProfileName);

        // create Job profile
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: jobProfileName
        };
        SettingsDataImport.goToJobProfiles();
        jobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        jobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload the exported marc file with 001 field
        dataImport.goToDataImport();
        dataImport.uploadExportedFile(nameForExportedMarcFile);
        jobProfiles.searchJobProfileForImport(jobProfileName);
        jobProfiles.runImportFile(nameForExportedMarcFile);
        logs.openJobProfile(nameForExportedMarcFile);
        logs.checkIsInstanceUpdated();

        cy.visit(topMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(id);

        // ensure the fields created in Field mapping profile exists in inventory
        SearchInventory.checkInstanceDetails();

        // clean up generated profiles
        jobProfiles.deleteJobProfile(jobProfileName);
        MatchProfiles.deleteMatchProfile(matchProfileName);
        ActionProfiles.deleteActionProfile(actionProfileName);
        FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      });
  });
});
