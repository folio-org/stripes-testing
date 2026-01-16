import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  INVOICE_STATUSES,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InvoiceLineDetails from '../../../support/fragments/invoices/invoiceLineDetails';
import { Organizations } from '../../../support/fragments/organizations';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing EDIFACT files', () => {
    const testData = {
      profileForDuplicate: FieldMappingProfiles.mappingProfileForDuplicate.hein,
      filePathForUpload: 'ediFileForC350716.txt',
      fileName: `C350715 autotestFile${getRandomPostfix()}.txt`,
    };
    const organization = {
      name: `WS Hein ${getRandomPostfix()}`,
      code: `Hein ${getRandomPostfix()}`,
      status: 'Active',
      isVendor: true,
    };
    const mappingProfile = {
      name: `C350716 Import Hein Serials Invoice ${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.AMHERST,
      organizationName: organization.name,
      paymentMethod: PAYMENT_METHOD.CASH,
      currency: 'USD',
    };
    const actionProfile = {
      name: `C350716 Import Hein subscription invoice ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350716 Import Hein Subscription Invoice ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        Organizations.createOrganizationViaApi(organization).then((response) => {
          organization.id = response;
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C350716 Ensure an EDIFACT file with file extension .txt imports without errors (folijet)',
      { tags: ['extendedPath', 'folijet', 'C350716'] },
      () => {
        // create Field mapping profile
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(
          mappingProfile,
          testData.profileForDuplicate,
        );
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
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.filePathForUpload, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.fileName);
        Logs.checkImportFile(jobProfile.profileName);
        LogsViewAll.verifyJobStatus(testData.fileName, JOB_STATUS_NAMES.COMPLETED);
        LogsViewAll.openFileDetails(testData.fileName);
        FileDetails.verifyEachInvoiceStatusInColunm(RECORD_STATUSES.CREATED);
        FileDetails.openInvoiceLine(RECORD_STATUSES.CREATED);

        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: 'Description', value: 'COLLECTED COURSES OF ACADEMY OF EUROPEAN LAW' },
            { key: 'Invoice line number', value: '1' },
            { key: 'Status', value: INVOICE_STATUSES.OPEN },
            { key: 'Quantity', value: '1' },
            { key: 'Sub-total', value: '$95.00' },
          ],
        });
      },
    );
  });
});
