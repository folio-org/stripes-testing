import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  INVOICE_STATUSES,
  PAYMENT_METHOD,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { InvoiceView, Invoices } from '../../../../support/fragments/invoices';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    const quantityOfItems = '1';
    const fileName = `C343338 autotestFile${getRandomPostfix()}.edi`;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;

    const mappingProfile = {
      name: `C343338 autoTestMappingProf.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.AMHERST,
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const actionProfile = {
      name: `C343338 autoTestActionProf.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C343338 autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };
    const vendorInvoiceNumber = '94999';

    before('Create test user and login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        // clean up generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.getInvoiceIdApi({
          query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"`,
        }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
      });
    });

    it(
      'C343338 EDIFACT file import with creating of new invoice record (folijet)',
      { tags: ['dryRun', 'folijet', 'C343338'] },
      () => {
        // create Field mapping profile
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(mappingProfile, profileForDuplicate);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create Action profile and link it to Field mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('ediFileForC343338.edi', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.invoice,
        );
        FileDetails.checkInvoiceInSummaryTable(quantityOfItems);
        FileDetails.getInvoiceNumber(vendorInvoiceNumber).then((invoiceNumber) => {
          cy.wait(2000);
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
          Invoices.searchByNumber(invoiceNumber);
          Invoices.selectInvoice(invoiceNumber);

          InvoiceView.checkInvoiceDetails({
            invoiceInformation: [
              { key: 'Invoice date', value: '11/24/2021' },
              { key: 'Status', value: INVOICE_STATUSES.OPEN },
              { key: 'Source', value: 'EDI' },
            ],
          });
        });
      },
    );
  });
});
