/// <reference types="cypress" />

import testTypes from '../../support/dictionary/testTypes';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs';
import topMenu from '../../support/fragments/topMenu';
import fileDetails from '../../support/fragments/data_import/fileDetails';

describe('ui-data-import: Import a large EDIFACT invoice file', () => {
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

  it('C347615 Import a large EDIFACT invoice file', { tags: [testTypes.smoke] }, () => {
    // unique name for profiles
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // unique file name to upload
    const fileName = `autotestFile.${getRandomPostfix()}.edi`;

    // create Field mapping profile
    settingsDataImport.goToMappingProfiles();
    fieldMappingProfiles.createLargeInvoiceMappingProfile(mappingProfileName);
    fieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      typeValue: 'Invoice',
    };

    settingsDataImport.goToActionProfiles();
    actionProfiles.createActionProfile(actionProfile, mappingProfileName);
    actionProfiles.checkActionProfilePresented(actionProfileName);

    // create Job profile
    const jobProfile = {
      ...newJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: newJobProfile.acceptedDataType.edifact
    };

    settingsDataImport.goToJobProfiles();
    jobProfiles.createJobProfile(jobProfile);
    newJobProfile.linkActionProfile(actionProfile);
    newJobProfile.saveAndClose();
    jobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(topMenu.dataImportPath);
    dataImport.uploadFile('largeInvoice.edi', fileName);
    jobProfiles.searchJobProfileForImport(jobProfile.profileName);
    jobProfiles.runImportFile(fileName);
    logs.checkImportFile(jobProfile.profileName);
    logs.checkStatusOfJobProfile();
    logs.checkQuantityRecordsInFile();
    logs.openJobProfile(fileName);
    logs.checkIsInvoiceCreated();
    fileDetails.checkQuantityInvoiceLinesInRecord();
  });
});
