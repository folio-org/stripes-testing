import TestTypes from '../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: Import a large EDIFACT invoice file', () => {
// unique name for profiles
  const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
  const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
  const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

  beforeEach(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getAdminToken();

    DataImport.checkUploadState();
  });

  afterEach(() => {
    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    DataImport.checkUploadState();
  });

  it('C347615 Import a large EDIFACT invoice file (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // unique file name to upload
    const fileName = `C347615autotestFile.${getRandomPostfix()}.edi`;

    // create Field mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.createInvoiceMappingProfile(mappingProfileName, FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz, NewMappingProfile.organization.harrassowitz);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      typeValue: 'Invoice',
    };

    cy.visit(SettingsMenu.actionProfilePath);
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
    DataImport.uploadFile('largeInvoice.edi', fileName);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(fileName);
    Logs.checkImportFile(jobProfile.profileName);
    Logs.checkStatusOfJobProfile();
    Logs.checkQuantityRecordsInFile(Logs.quantityRecordsInInvoice.firstQuantity);
    Logs.openFileDetails(fileName);
    InvoiceView.checkQuantityInvoiceLinesInRecord();
  });
});
