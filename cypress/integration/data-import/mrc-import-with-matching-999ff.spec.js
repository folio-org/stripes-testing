import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import testTypes from '../../support/dictionary/testTypes';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import exportFile from '../../support/fragments/data-export/exportFile';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: MARC file import with matching for 999 ff field', () => {
  // unique file name to upload
  const nameForMarcFile = `autotestFile${getRandomPostfix()}.mrc`;
  const nameForExportedMarcFile = `autotestFile${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
  const mappingProfileName = `autotestMappingProf${getRandomPostfix()}`;
  const matchProfileName = `autotestMatchProf${getRandomPostfix()}`;
  const actionProfileName = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const mappingProfileNameForExport = `autotestMappingProf${getRandomPostfix()}`;
  const actionProfileNameForExport = `autotestActionProf${getRandomPostfix()}`;
  const jobProfileNameForExport = `autotestJobProf${getRandomPostfix()}`;

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
  });

  it('C343343 MARC file import with matching for 999 ff field', { tags: testTypes.smoke }, () => {
    // create Field mapping profile for export
    const mappingProfileForExport = {
      name: mappingProfileNameForExport,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    };
    SettingsDataImport.goToMappingProfiles();
    FieldMappingProfiles.createMappingProfile(mappingProfileForExport);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileNameForExport);

    // create Action profile for export and link it to Field mapping profile
    const actionProfileForExport = {
      typeValue : NewActionProfile.folioRecordTypeValue.instance,
      name: actionProfileNameForExport
    };
    SettingsDataImport.goToActionProfiles();
    ActionProfiles.createActionProfile(actionProfileForExport, mappingProfileForExport.name);
    ActionProfiles.checkActionProfilePresented(actionProfileNameForExport);

    // create job profile for export
    const jobProfileForExport = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileNameForExport
    };
    SettingsDataImport.goToJobProfiles();
    jobProfiles.createJobProfileWithLinkingProfiles(jobProfileForExport, actionProfileForExport);
    jobProfiles.checkJobProfilePresented(jobProfileNameForExport);

    // upload a marc file for export
    dataImport.goToDataImport();
    dataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    jobProfiles.searchJobProfileForImport(jobProfileNameForExport);
    jobProfiles.runImportFile(nameForMarcFile);
    logs.openJobProfile(nameForMarcFile);
    logs.checkIsInstanceCreated();

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);

        // download exported marc file
        exportFile.uploadFile(nameForCSVFile);
        exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
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
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

        // create Action profile and link it to Field mapping profile
        const actionProfile = {
          typeValue : NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileName,
          action: 'Update (all record types except Orders)'
        };
        SettingsDataImport.goToActionProfiles();
        ActionProfiles.createActionProfile(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfileName);

        // create Job profile
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: jobProfileName,
          acceptedType: NewJobProfile.acceptedDataType.marc
        };
        SettingsDataImport.goToJobProfiles();
        jobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        jobProfiles.checkJobProfilePresented(jobProfileName);

        // upload the exported marc file with 999.f.f.s fields
        dataImport.goToDataImport();
        dataImport.uploadExportedFile(nameForExportedMarcFile);
        jobProfiles.searchJobProfileForImport(jobProfileName);
        jobProfiles.runImportFile(nameForExportedMarcFile);
        logs.openJobProfile(nameForExportedMarcFile);
        logs.checkIsInstanceUpdated();

        // get Instance HRID through API
        SearchInventory
          .getInstanceHRID()
          .then(hrId => {
            cy.visit(TopMenu.inventoryPath);
            SearchInventory.searchInstanceByHRID(hrId);

            // ensure the fields created in Field mapping profile exists in inventory
            SearchInventory.checkInstanceDetails();

            // clean up generated profiles
            jobProfiles.deleteJobProfile(jobProfileName);
            jobProfiles.deleteJobProfile(jobProfileNameForExport);
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
