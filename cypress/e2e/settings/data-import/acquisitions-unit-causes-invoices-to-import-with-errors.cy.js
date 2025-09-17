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
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
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
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    const filePathForUpload = 'ediFileForC345356.edi';
    const editedFileForUpload = `C345356 autotestFile${getRandomPostfix()}.edi`;
    const fileName = `C345356 autotestFile${getRandomPostfix()}.edi`;
    const invoiceNumber = `${randomFourDigitNumber()}3`;
    const quantityOfItems = '1';
    const mappingProfile = {
      name: `C345356 GOBI invoice - Acq Units.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      acquisitionsUnits: `"${defaultAcquisitionUnit.name}"`,
      batchGroup: BATCH_GROUP.FOLIO,
      lockTotalAmount: 'MOA+86[2]',
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const actionProfile = {
      name: `C345356 GOBI invoice - Acq Units.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C345356 GOBI invoice - Acq Units.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.assignAcqUnitsToNewInvoice.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
          authRefresh: true,
        });
        // need to edit file for creating unique invoice number
        DataImport.editMarcFile(filePathForUpload, editedFileForUpload, ['19353'], [invoiceNumber]);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedFileForUpload}`);
      cy.loginAsAdmin();
      cy.visit(SettingsMenu.acquisitionUnitsPath);
      AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
      AcquisitionUnits.delete(defaultAcquisitionUnit.name);
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C345356 Acquisitions unit causes Invoices to Import with errors (folijet)',
      { tags: ['extendedPath', 'folijet', 'C345356'] },
      () => {
        AcquisitionUnits.newAcquisitionUnit();
        AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
        // Need to wait until data will be loaded
        cy.wait(2000);
        AcquisitionUnits.assignUser(user.username);

        // create Field mapping profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
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

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        LogsViewAll.verifyJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        LogsViewAll.openFileDetails(fileName);
        FileDetails.verifyEachInvoiceStatusInColunm(RECORD_STATUSES.CREATED);
        FileDetails.checkInvoiceInSummaryTable(quantityOfItems);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.searchByNumber(invoiceNumber);
        Invoices.selectInvoice(invoiceNumber);
        InvoiceView.verifyAcquisitionUnits(defaultAcquisitionUnit.name);
      },
    );
  });
});
