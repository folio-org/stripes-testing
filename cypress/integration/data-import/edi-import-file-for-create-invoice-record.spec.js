/// <reference types="cypress" />

import TestTypes from '../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import InvoiceView from '../../support/fragments/invoices/invoiceView';

describe('ui-data-import: EDIFACT file import with creating of new invoice record', () => {
  beforeEach(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    DataImport.checkUploadState();
  });

  /*afterEach(() => {
    cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"` })
      .then(id => cy.deleteInvoiceFromStorageApi(id));

    DataImport.checkUploadState();
  });*/

  it('C343338 EDIFACT file import with creating of new invoice record', { tags: [TestTypes.smoke] }, () => {
    // unique name for profiles
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // unique file name to upload
    const fileName = `C343338autotestFile.${getRandomPostfix()}.edi`;

    // create Field mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.waitLoading();
    FieldMappingProfiles.createInvoiceMappingProfile(mappingProfileName, FieldMappingProfiles.mappingProfileForDuplicate.gobi, NewMappingProfile.organization.gobiLibrary);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      typeValue: 'Invoice',
    };

    cy.visit(SettingsMenu.actionProfilePath);
    // TODO: issue with mapping of action and mapping profiles
    ActionProfiles.createActionProfile(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create Job profile
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.edifact
    };

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkActionProfile(actionProfile);
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('invoice.edi', fileName);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(fileName);
    Logs.checkImportFile(jobProfile.profileName);
    Logs.checkStatusOfJobProfile();
    Logs.openFileDetails(fileName);
    FileDetails.checkIsInvoiceCreated();
    InvoiceView.checkInvoiceDetails(InvoiceView.vendorInvoiceNumber);

    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });
});
