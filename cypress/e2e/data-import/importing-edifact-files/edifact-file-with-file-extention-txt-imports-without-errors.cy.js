import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  INVOICE_STATUSES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InvoiceLineDetails from '../../../support/fragments/invoices/invoiceLineDetails';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Organizations from '../../../support/fragments/organizations/organizations';

describe('data-import', () => {
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
      batchGroup: BATCH_GROUP.FOLIO,
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

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      });
    });

    it(
      'C350716 Ensure an EDIFACT file with file extension .txt imports without errors (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Organizations.createOrganizationViaApi(organization).then((response) => {
          testData.organization = response;
        });

        // create Field mapping profile
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(
          mappingProfile,
          testData.profileForDuplicate,
        );
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
        DataImport.uploadFile(testData.filePathForUpload, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.fileName);
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
