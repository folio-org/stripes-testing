import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
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
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const randomPostfix = getRandomPostfix();
    // The fixture is a trimmed copy of the file attached to the test case: 5 invoices in a
    // non-sorted order, two of them with more than 9 invoice lines (11 and 20), 53 lines in total
    const fixtureFileName = 'ediFileForC347925.edi';
    const originalInvoiceNumbers = ['450204', '450205', '450199', '450196', '450213'];
    const quantityOfInvoiceLines = 53;
    // Invoice numbers must be unique, otherwise the import fails as a duplicate of an existing invoice
    const invoiceNumbersPrefix = randomNDigitNumber(7);
    const invoiceNumbers = originalInvoiceNumbers.map(
      (_, index) => `${invoiceNumbersPrefix}${index}`,
    );
    const editedFileName = `AT_C347925_EdifactFile_${randomPostfix}.edi`;
    const fileName = `AT_C347925_autotestFile_${randomPostfix}.edi`;
    const mappingProfile = {
      name: `AT_C347925_MappingProfile_${randomPostfix}`,
      description: '',
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      batchGroup: BATCH_GROUP.FOLIO,
      lockTotalAmount: 'MOA+39?4[2]',
      organizationName: VENDOR_NAMES.HARRASSOWITZ,
      paymentMethod: PAYMENT_METHOD.CASH,
      subTotal: 'MOA+203?4[2]',
    };
    const actionProfile = {
      name: `AT_C347925_ActionProfile_${randomPostfix}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C347925_JobProfile_${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    before('Create test user, prepare file and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.readFile(`cypress/fixtures/${fixtureFileName}`).then((content) => {
          const editedContent = originalInvoiceNumbers.reduce(
            (result, originalNumber, index) =>
              result.replace(`BGM+380+${originalNumber}+`, `BGM+380+${invoiceNumbers[index]}+`),
            content,
          );

          FileManager.createFile(`cypress/fixtures/${editedFileName}`, editedContent);
        });

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        invoiceNumbers.forEach((number) => {
          cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${number}"` }).then((id) =>
            cy.deleteInvoiceFromStorageViaApi(id),
          );
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      });
    });

    it(
      'C347925 Check Invoice log detail sort by Record column in Data Import detail log (promin)',
      { tags: ['extendedPath', 'promin', 'C347925'] },
      () => {
        // Step 1: Settings > Data import > Field mapping profiles - the list of profiles is shown
        FieldMappingProfiles.waitLoading();

        // Steps 2-4: Duplicate "Default - Harrassowitz serials invoice"; update and save the copy
        FieldMappingProfiles.createInvoiceMappingProfile(
          mappingProfile,
          FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz,
        );
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // Step 5: Create an action profile linked to the new mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // Step 6: Create a job profile (EDIFACT) with the new action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // Step 7: Data import app - upload the Harrassowitz invoice file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileName, fileName);
        JobProfiles.waitFileIsUploaded();

        // Step 8: Select the new job profile and run the import
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);

        // Step 9: Open the log of the imported file - all invoice lines are listed
        LogsViewAll.verifyJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        LogsViewAll.openFileDetails(fileName);
        FileDetails.verifyEachInvoiceStatusInColunm(RECORD_STATUSES.CREATED);

        // Step 10: Invoice lines are in numerical order (invoices with more than 9 lines included)
        FileDetails.verifyRecordColumnIsInNumericalOrder({
          expectedRowsCount: quantityOfInvoiceLines,
        });
      },
    );
  });
});
