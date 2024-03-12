import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  VENDOR_NAMES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const quantityOfInvoiceLines = '1,104';
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz;
    const fileName = `C347615autotestFile.${getRandomPostfix()}.edi`;
    const mappingProfile = {
      name: `Import Large Harrassowitz Serials Invoice ${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName: VENDOR_NAMES.HARRASSOWITZ,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const actionProfile = {
      name: `Create Large Harrassowitz serials invoice ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `Create Large Harrassowitz serials invoice ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    beforeEach('login', () => {
      cy.loginAsAdmin();
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        // clean up generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C347615 Import a large EDIFACT invoice file (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
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
        DataImport.verifyUploadState();
        DataImport.uploadFile('ediFileForC347615.edi', fileName);
        DataImport.waitFileIsUploaded();
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkQuantityRecordsInFile(Logs.quantityRecordsInInvoice.firstQuantity);
        Logs.openFileDetails(fileName);
        InvoiceView.checkQuantityInvoiceLinesInRecord(quantityOfInvoiceLines);
      },
    );
  });
});
