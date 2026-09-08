import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  PAYMENT_METHOD,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InvoiceEditForm from '../../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const postfix = getRandomPostfix();
    const testData = {
      organizationName: `AT_C434076_Vendor_${postfix}`,
      invoiceNumber1: '434076434076',
      invoiceNumber2: '434076434077',
      account1: {
        name: `AT_C434076_Acc1_${postfix}`,
        accountNo: `ACC1_${postfix}`,
        accountingCode: `CODE1_${postfix}`,
      },
      account2: {
        name: `AT_C434076_Acc2_${postfix}`,
        accountNo: `ACC2_${postfix}`,
        accountingCode: `CODE2_${postfix}`,
      },
      mappingProfile: {
        name: `AT_C434076_MappingProfile_${postfix}`,
        incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
        typeValue: FOLIO_RECORD_TYPE.INVOICE,
        batchGroup: BATCH_GROUP.FOLIO,
        paymentMethod: PAYMENT_METHOD.CASH,
      },
      actionProfile: {
        name: `AT_C434076_ActionProfile_${postfix}`,
        typeValue: FOLIO_RECORD_TYPE.INVOICE,
      },
      jobProfile: {
        ...NewJobProfile.defaultJobProfile,
        profileName: `AT_C434076_JobProfile_${postfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
      },
      edifactFile1: 'ediFileForC434076.edi',
      edifactFile2: 'ediFileForC434076_2.edi',
      organizationId: null,
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      [testData.invoiceNumber1, testData.invoiceNumber2].forEach((invoiceNumber) => {
        Invoices.getInvoiceViaApi({ query: `vendorInvoiceNo="${invoiceNumber}"` }).then(
          ({ invoices }) => {
            if (invoices?.length) {
              invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false }));
            }
          },
        );
      });

      Organizations.createOrganizationViaApi({
        ...NewOrganization.getDefaultOrganization(),
        name: testData.organizationName,
        erpCode: testData.account1.accountingCode,
        accounts: [
          {
            name: testData.account1.name,
            accountNo: testData.account1.accountNo,
            appSystemNo: testData.account1.accountingCode,
            paymentMethod: 'Cash',
            accountStatus: 'Active',
            acqUnitIds: [],
          },
          {
            name: testData.account2.name,
            accountNo: testData.account2.accountNo,
            appSystemNo: testData.account2.accountingCode,
            paymentMethod: 'Cash',
            accountStatus: 'Active',
            acqUnitIds: [],
          },
        ],
      }).then((id) => {
        testData.organizationId = id;
      });

      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.mappingProfile.name);
        Organizations.deleteOrganizationViaApi(testData.organizationId);
        [testData.invoiceNumber1, testData.invoiceNumber2].forEach((invoiceNumber) => {
          Invoices.getInvoiceViaApi({ query: `vendorInvoiceNo="${invoiceNumber}"` }).then(
            ({ invoices }) => {
              if (invoices?.length) {
                invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false }));
              }
            },
          );
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C434076 Check the accounting code of imported invoice with 3 different accounting codes in vendor organization',
      { tags: ['extendedPath', 'promin', 'C434076'] },
      () => {
        const fileName = `C434076 autotestFile${getRandomPostfix()}.edi`;
        const fileName2 = `C434076 autotestFile2${getRandomPostfix()}.edi`;

        // Steps 1-2: Duplicate GOBI mapping profile; set vendor, accounting code (account1), batch group, payment method
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(
          {
            ...testData.mappingProfile,
            organizationName: testData.organizationName,
            accountingCode: `"${testData.account1.accountingCode}"`,
          },
          FieldMappingProfiles.mappingProfileForDuplicate.gobi,
        );
        FieldMappingProfiles.checkMappingProfilePresented(testData.mappingProfile.name);

        // Steps 3-4: Create action profile linked to mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(testData.actionProfile, testData.mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(testData.actionProfile.name);

        // Steps 5-6: Create job profile linked to action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(testData.jobProfile);
        NewJobProfile.linkActionProfile(testData.actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(testData.jobProfile.profileName);

        // Steps 7-8: Upload first EDIFACT file and run import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.edifactFile1, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();

        // Step 9: Verify import completed successfully
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(testData.jobProfile.profileName);

        // Steps 10-13: Find imported invoice in Invoices app; verify accounting code matches account1
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoiceNumber1);
        InvoiceView.waitLoading();
        InvoiceView.openInvoiceEditForm();
        InvoiceEditForm.verifyAccountingCode(testData.account1.accountingCode);
        InvoiceEditForm.clickCancelButton();

        // Step 14: Navigate to Settings > Data Import > Field Mapping Profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);

        // Steps 15-16: Edit mapping profile; update accounting code to account2
        FieldMappingProfiles.search(testData.mappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(testData.mappingProfile.name);
        cy.wait(2000); // wait for the profile to load before editing
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.fillInvoiceMappingProfile({
          name: testData.mappingProfile.name,
          incomingRecordType: testData.mappingProfile.incomingRecordType,
          typeValue: testData.mappingProfile.typeValue,
          batchGroup: testData.mappingProfile.batchGroup,
          organizationName: testData.organizationName,
          accountingCode: `"${testData.account2.accountingCode}"`,
          paymentMethod: testData.mappingProfile.paymentMethod,
        });
        FieldMappingProfileView.closeViewMode(testData.mappingProfile.name);

        // Step 17: Upload second EDIFACT file and run import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        cy.wait(1000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.edifactFile2, fileName2);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();

        Logs.waitFileIsImported(fileName2);
        Logs.checkImportFile(testData.jobProfile.profileName);

        // Verify second imported invoice has accounting code matching account2
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.selectInvoiceByNumber(testData.invoiceNumber2);
        InvoiceView.waitLoading();
        InvoiceView.openInvoiceEditForm();
        InvoiceEditForm.verifyAccountingCode(testData.account2.accountingCode);
      },
    );
  });
});
