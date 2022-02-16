/// <reference types="cypress" />

import testTypes from '../../support/dictionary/testTypes';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import matchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import dataImport from '../../support/fragments/data_import/dataImport';
import topMenu from '../../support/fragments/topMenu';
import logs from '../../support/fragments/data_import/logs';

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
    // unique name for profiles
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const matchProfileName = `autoTestMatchProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // file name
    const nameMarcFileForUpload = `autotestFile.${getRandomPostfix()}.mrc`;

    // create Field mapping profile
    const mappingProfile = {
      name: mappingProfileName
    };

    settingsDataImport.goToMappingProfiles();
    fieldMappingProfiles.createModifyMappingProfile(mappingProfile);
    fieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      action: 'Modify (MARC record types only)',
      typeValue: 'MARC Bibliographic',
    };

    settingsDataImport.goToActionProfiles();
    actionProfiles.createActionProfile(actionProfile, mappingProfile);
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

    settingsDataImport.goToMatchProfiles();
    matchProfiles.createMatchProfile(matchProfile);

    // create Job profile
    const jobProfile = {
      ...newJobProfile.defaultJobProfile,
      profileName: jobProfileName
    };
    settingsDataImport.goToJobProfiles();
    jobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    jobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(topMenu.dataImportPath);
    dataImport.uploadFile('oneMarcBib_changed001field.mrc', nameMarcFileForUpload);
    jobProfiles.searchJobProfileForImport(jobProfile.profileName);
    jobProfiles.runImportFile(nameMarcFileForUpload);
    logs.checkImportFile(jobProfile.profileName);
    logs.checkStatusOfJobProfile();
    logs.openJobProfile(nameMarcFileForUpload);
    logs.checkUpdatedSrsAndInstance();

    // delete profiles
    jobProfiles.deleteJobProfile(jobProfileName);
    matchProfiles.deleteMatchProfile(matchProfileName);
    actionProfiles.deleteActionProfile(actionProfileName);
    fieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });
});
