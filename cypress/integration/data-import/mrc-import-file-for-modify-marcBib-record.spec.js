/// <reference types="cypress" />

import TestTypes from '../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import ExportFile from '../../support/fragments/data-export/exportFile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-data-import: Verify the possibility to modify MARC Bibliographic record', () => {
  beforeEach(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    DataImport.cleanUploadFile();
  });

  afterEach(() => {
    cy.getSrsRecordApi()
      .then(({ body }) => {
        cy.deleteSrsRecordFromStorageApi(body.records[body.records.length - 1].id);
      });

    DataImport.cleanUploadFile();
  });

  it('C345423 Verify the possibility to modify MARC Bibliographic record', { tags: [TestTypes.smoke] }, () => {
    const mappingProfileFieldsForModify = {
      marcMappingOption: 'Modifications',
      action: 'Add',
      addFieldNumber: '947',
      subfieldInFirstField: 'a',
      subaction: 'Add subfield',
      subfieldTextInFirstField: 'Test',
      subfieldInSecondField: 'b',
      subfieldTextInSecondField: 'Addition',
    };

    // unique name for profiles
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const matchProfileName = `autoTestMatchProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // file name
    const nameMarcFileForCreate = `autotestFile.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForUpload = `autotestFile.${getRandomPostfix()}.mrc`;

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(nameMarcFileForCreate);
    Logs.openFileDetails(nameMarcFileForCreate);
    FileDetails.checkCreatedSrsAndInstance();

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        SearchInventory.searchInstanceByHRID(id);
        InventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });
    // download exported marc file
    cy.visit(TopMenu.dataExportPath);
    ExportFile.uploadFile(nameForCSVFile);
    ExportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
    ExportMarcFile.downloadExportedMarcFile(nameMarcFileForUpload);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));

    // create Field mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createModifyMappingProfile(mappingProfileName, mappingProfileFieldsForModify);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      action: 'Modify (MARC record types only)',
      typeValue: 'MARC Bibliographic',
    };

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

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

    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);

    // create Job profile
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.marc
    };
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile(nameMarcFileForUpload);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(nameMarcFileForUpload);
    Logs.checkImportFile(jobProfile.profileName);
    Logs.checkStatusOfJobProfile();
    Logs.openFileDetails(nameMarcFileForUpload);
    FileDetails.checkUpdatedSrsAndInstance();

    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpload}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });
});
