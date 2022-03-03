/// <reference types="cypress" />

import testTypes from '../../support/dictionary/testTypes';
import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import matchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs/logs';
import searchInventory from '../../support/fragments/data_import/searchInventory';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import exportMarcFile from '../../support/fragments/data-export/export-marc-file';
import fileManager from '../../support/utils/fileManager';
import exportFile from '../../support/fragments/data-export/exportFile';
import settingsMenu from '../../support/fragments/settingsMenu';
import fileDetails from '../../support/fragments/data_import/logs/fileDetails';

describe('ui-data-import: Verify the possibility to modify MARC Bibliographic record', () => {
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

  afterEach(() => {
    cy.getSrsRecordApi()
      .then(({ body }) => {
        cy.deleteSrsRecordFromStorageApi(body.records[body.records.length - 1].id);
      });
  });

  it('C345423 Verify the possibility to modify MARC Bibliographic record', { tags: [testTypes.smoke] }, () => {
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
    const jobProfileNameForExport = `autoTestJobProf.${getRandomPostfix()}`;

    // file name
    const nameMarcFileForCreate = `C343335autotestFile.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForUpload = `C345423autotestFile.${getRandomPostfix()}.mrc`;

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(`${settingsMenu.dataImportPath}`);
    dataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
    jobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    jobProfiles.runImportFile(nameMarcFileForCreate);
    logs.openFileDetails(nameMarcFileForCreate);
    fileDetails.checkCreatedItems();

    // get Instance HRID through API
    searchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        cy.visit(`${settingsMenu.inventoryPath}`);
        searchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        exportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        fileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });
    // download exported marc file
    cy.visit(`${settingsMenu.dataExportPath}`);
    exportFile.uploadFile(nameForCSVFile);
    exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
    exportMarcFile.downloadExportedMarcFile(jobProfileNameForExport);
    fileManager.deleteFolder(Cypress.config('downloadsFolder'));

    // create Field mapping profile
    cy.visit(`${settingsMenu.mappingProfilePath}`);
    fieldMappingProfiles.createModifyMappingProfile(mappingProfileName, mappingProfileFieldsForModify);
    fieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      action: 'Modify (MARC record types only)',
      typeValue: 'MARC Bibliographic',
    };

    cy.visit(`${settingsMenu.actionProfilePath}`);
    actionProfiles.createActionProfile(actionProfile, mappingProfileName);
    actionProfiles.checkActionProfilePresented(actionProfileName);

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

    cy.visit(`${settingsMenu.matchProfilePath}`);
    matchProfiles.createMatchProfile(matchProfile);

    // create Job profile
    const jobProfile = {
      ...newJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: newJobProfile.acceptedDataType.marc
    };
    cy.visit(`${settingsMenu.jobProfilePath}`);
    jobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    jobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(`${settingsMenu.dataImportPath}`);
    dataImport.uploadFile(nameMarcFileForUpload);
    jobProfiles.searchJobProfileForImport(jobProfile.profileName);
    jobProfiles.runImportFile(nameMarcFileForUpload);
    logs.checkImportFile(jobProfile.profileName);
    logs.checkStatusOfJobProfile();
    logs.openFileDetails(nameMarcFileForUpload);
    logs.checkUpdatedSrsAndInstance();

    // delete profiles
    jobProfiles.deleteJobProfile(jobProfileName);
    matchProfiles.deleteMatchProfile(matchProfileName);
    actionProfiles.deleteActionProfile(actionProfileName);
    fieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

    // delete downloads folder and created files in fixtures
    fileManager.deleteFolder(Cypress.config('downloadsFolder'));
    fileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpload}`);
    fileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });
});
