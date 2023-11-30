import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing EDIFACT files', () => {
    let user;
    const quantityOfInvoices = '5';
    const quantityOfInvoiceLines = '122';
    const invoiceNumbers = ['263056', '263057', '263058', '263059', '263061'];
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz;
    const filePathForUpload = 'ediFileForC347926.edi';
    const fileName = `C347926autotestFile.${getRandomPostfix()}.edi`;
    const mappingProfile = {
      name: `C347926 Import Harrassowitz invoice.${getRandomPostfix()}`,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      lockTotalAmount: 'MOA+9?4[2]',
      organizationName: VENDOR_NAMES.HARRASSOWITZ,
      paymentMethod: PAYMENT_METHOD.CASH,
      invoiceLinePOlDescription: '{POL_title}; else IMD++050+[4-5]',
      polNumber: 'RFF+SNA[2]',
      polVendorReferenceNumber: 'RFF+SLI[2]',
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const actionProfile = {
      name: `C347926 Import Harrassowitz invoice.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
        invoiceNumbers.forEach((number) => {
          cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${number}"` }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C347926 Check EDIFACT invoice import when Invoice line description is incorrectly constructed (folijet)',
      { tags: ['extendedPath', 'folijet', 'nonParallel'] },
      () => {
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

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(fileName);
        FileDetails.verifyEachInvoiceStatusInColunm('Created');
        cy.wait(2000);
        FileDetails.verifyEachInvoiceTitleInColunm();
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyEachInvoiceStatusInColunm('Created');
        cy.wait(2000);
        FileDetails.verifyEachInvoiceTitleInColunm();
        Logs.checkQuantityRecordsInFile(quantityOfInvoices);
        InvoiceView.checkQuantityInvoiceLinesInRecord(quantityOfInvoiceLines);
      },
    );
  });
});
