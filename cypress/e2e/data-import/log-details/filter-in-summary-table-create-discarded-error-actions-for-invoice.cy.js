import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import { FOLIO_RECORD_TYPE, PAYMENT_METHOD, BATCH_GROUP } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const invoiceNumber = '1024200';
  const quantityOfItems = '1';
  const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.ebsco;
  const marcFileName = `C357018 autotest file ${getRandomPostfix()}`;
  const mappingProfile = {
    name:`C357018 Test invoice log table Create EBSCO invoice ${getRandomPostfix()}`,
    incomingRecordType:NewFieldMappingProfile.incomingRecordType.edifact,
    existingRecordType:FOLIO_RECORD_TYPE.INVOICE,
    description:'',
    batchGroup: BATCH_GROUP.AMHERST,
    organizationName: NewFieldMappingProfile.organization.ebsco,
    paymentMethod: PAYMENT_METHOD.CREDIT_CARD
  };
  const actionProfile = {
    name: `C357018 Test invoice log table ${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.INVOICE,
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autoTestJobProf.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.edifact
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrganizationsViewEditCreate.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${invoiceNumber}"` })
      .then(id => cy.deleteInvoiceFromStorageViaApi(id));
  });

  it('C357018 Check the filter in summary table with "create + discarded + error" actions for the Invoice column (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
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

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('ediFileForC357018.edi', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile('Completed with errors');
      Logs.openFileDetails(marcFileName);

      // check created counter in the Summary table
      FileDetails.checkInvoiceInSummaryTable(quantityOfItems, 0);
      // check Discarded counter in the Summary table
      FileDetails.checkInvoiceInSummaryTable(quantityOfItems, 2);
      // check Error counter in the Summary table
      FileDetails.checkInvoiceInSummaryTable(quantityOfItems, 3);
      FileDetails.filterRecordsWithError(quantityOfItems);
      FileDetails.verifyQuantityOfRecordsWithError(3);
      FileDetails.verifyLogSummaryTableIsHidden();
      FileDetails.verifyRecordsSortingOrder();
    });
});
