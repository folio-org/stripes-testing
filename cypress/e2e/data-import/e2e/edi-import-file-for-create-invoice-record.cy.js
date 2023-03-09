import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';

describe('ui-data-import: EDIFACT file import with creating of new invoice record', () => {
  // unique name for profiles
  const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
  const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
  const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;
  let user = {};

  before(() => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.viewOrganization.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    DataImport.checkUploadState();
  });

  after(() => {
    cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"` })
      .then(id => cy.deleteInvoiceFromStorageApi(id));
    DataImport.checkUploadState();
    Users.deleteViaApi(user.userId);

    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
  });

  it('C343338 EDIFACT file import with creating of new invoice record (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // unique file name to upload
    const fileName = `C343338autotestFile.${getRandomPostfix()}.edi`;

    // create Field mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.waitLoading();
    FieldMappingProfiles.createInvoiceMappingProfile(mappingProfileName, FieldMappingProfiles.mappingProfileForDuplicate.gobi, NewFieldMappingProfile.organization.gobiLibrary);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      name: actionProfileName,
      typeValue: 'Invoice',
    };

    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(actionProfile, mappingProfileName);
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
    // TODO delete code after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.clickDataImportNavButton();
    DataImport.uploadFile('ediFileForC343338.edi', fileName);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.selectJobProfile();
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkImportFile(jobProfile.profileName);
    Logs.checkStatusOfJobProfile();
    Logs.openFileDetails(fileName);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.invoice);
    FileDetails.checkCreatedInvoiceISummaryTable('1');
    InvoiceView.checkInvoiceDetails(InvoiceView.vendorInvoiceNumber);
  });
});
