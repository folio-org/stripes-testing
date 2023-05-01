import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { FOLIO_RECORD_TYPE, PAYMENT_METHOD, BATCH_GROUP } from '../../../support/constants';
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
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  const quantityOfItems = '1';
  const fileName = `C343338autotestFile.${getRandomPostfix()}.edi`;
  const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
  let user = {};

  const mappingProfile = {
    name:`autoTestMappingProf.${getRandomPostfix()}`,
    incomingRecordType:NewFieldMappingProfile.incomingRecordType.edifact,
    existingRecordType:FOLIO_RECORD_TYPE.INVOICE,
    description:'',
    batchGroup: BATCH_GROUP.FOLIO,
    organizationName: NewFieldMappingProfile.organization.gobiLibrary,
    paymentMethod: PAYMENT_METHOD.CASH
  };
  const actionProfile = {
    name: `autoTestActionProf.${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.INVOICE
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autoTestJobProf.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.edifact
  };

  before('login', () => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrganizationsView.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"` })
      .then(id => cy.deleteInvoiceFromStorageViaApi(id));
    Users.deleteViaApi(user.userId);
  });

  it('C343338 EDIFACT file import with creating of new invoice record (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create Field mapping profile
      FieldMappingProfiles.waitLoading();
      FieldMappingProfiles.createInvoiceMappingProfile(mappingProfile, profileForDuplicate);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create Action profile and link it to Field mapping profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('ediFileForC343338.edi', fileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.selectJobProfile();
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkImportFile(jobProfile.profileName);
      Logs.checkStatusOfJobProfile();
      Logs.openFileDetails(fileName);
      FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.invoice);
      FileDetails.checkInvoiceInSummaryTable(quantityOfItems);
      InvoiceView.checkInvoiceDetails(InvoiceView.vendorInvoiceNumber);
    });
});
