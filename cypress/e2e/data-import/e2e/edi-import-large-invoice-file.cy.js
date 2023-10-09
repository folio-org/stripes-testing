import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
  BATCH_GROUP,
  ACCEPTED_DATA_TYPE_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const quantityOfInvoiceLines = '1,104';
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz;
    const fileName = `C347615autotestFile.${getRandomPostfix()}.edi`;
    const mappingProfile = {
      name: `Import Large Harrassowitz Serials Invoice ${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      existingRecordType: FOLIO_RECORD_TYPE.INVOICE,
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
      cy.getAdminToken();
    });

    after('delete test data', () => {
      // clean up generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C347615 Import a large EDIFACT invoice file (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('ediFileForC347615.edi', fileName);
        DataImport.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile();
        Logs.checkQuantityRecordsInFile(Logs.quantityRecordsInInvoice.firstQuantity);
        Logs.openFileDetails(fileName);
        InvoiceView.checkQuantityInvoiceLinesInRecord(quantityOfInvoiceLines);
      },
    );
  });
});
