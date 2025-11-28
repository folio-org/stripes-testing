import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
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
  describe('Settings', () => {
    let user;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.harrassowitz;
    const filePathForUpload = 'ediFileForC345353.edi';
    const fileNameForFirstImport = `C345353 autotestFileName${getRandomPostfix()}`;
    const fileNameForSecondImport = `C345353 autotestFileName${getRandomPostfix()}`;
    const invoiceNumber = '246816';
    const invoiceData = [
      {
        invoiceNote: 'HARRAS0001118 OTTO HARRASSOWITZ',
        subscriptionInfo: '01.Jan.2021 iss.1 31.Dec.2021 iss.24',
        comment: '01.Jan.2021 iss.1 31.Dec.2021 iss.24',
      },
      {
        invoiceNote: 'HARRAS0001118-OTTO HARRASSOWITZ',
        subscriptionInfo: '01.Jan.2021 iss.1-31.Dec.2021 iss.24',
        comment: '01.Jan.2021 iss.1-31.Dec.2021 iss.24',
      },
    ];
    const collectionOfProfiles = [
      {
        mappingProfile: {
          incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
          typeValue: FOLIO_RECORD_TYPE.INVOICE,
          name: `C345353 Test Harrassowitz invoice with space.${getRandomPostfix()}`,
          description: '',
          batchGroup: BATCH_GROUP.FOLIO,
          invoiceNote: 'RFF+API[2] " " NAD+SU+++[1]',
          organizationName: VENDOR_NAMES.HARRASSOWITZ,
          paymentMethod: PAYMENT_METHOD.CASH,
          currency: 'USD',
          invoiceLinePOlDescription: '{POL_title}; else IMD+L+050+[4-5]',
          polNumber: 'RFF+LI[2]',
          subscriptionInfo: 'IMD+L+085+[4-5] " " IMD+L+086+[4-5]',
          subscriptionStartDate: 'DTM+194[2]',
          subscriptionEndDate: 'DTM+206[2]',
          comment: 'IMD+L+085+[4-5] " " IMD+L+086+[4-5]',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INVOICE,
          name: `C345353 Change to Test Harrassowitz invoice with space.${getRandomPostfix()}`,
        },
        jobProfile: {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C345353 Change to Test Harrassowitz invoice with space.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
        },
      },
      {
        mappingProfile: {
          incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
          typeValue: FOLIO_RECORD_TYPE.INVOICE,
          name: `C345353 Test Harrassowitz invoice with hyphen.${getRandomPostfix()}`,
          invoiceNote: 'RFF+API[2] "-" NAD+SU+++[1]',
          subscriptionInfo: 'IMD+L+085+[4-5] "-" IMD+L+086+[4-5]',
          comment: 'IMD+L+085+[4-5] "-" IMD+L+086+[4-5]',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INVOICE,
          name: `C345353 Test Harrassowitz invoice with hyphen.${getRandomPostfix()}`,
        },
        jobProfile: {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C345353 Test Harrassowitz invoice with hyphen.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
        },
      },
    ];

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${invoiceNumber}"` }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
        collectionOfProfiles.forEach((profile) => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.jobProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C345353 Check EDIFACT mapping syntax for multiple fields mapping into 1 invoice field (folijet)',
      { tags: ['extendedPath', 'folijet', 'C345353'] },
      () => {
        // create Field mapping profiles
        FieldMappingProfiles.waitLoading();
        FieldMappingProfiles.createInvoiceMappingProfile(
          collectionOfProfiles[0].mappingProfile,
          profileForDuplicate,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.createInvoiceMappingProfile(
          collectionOfProfiles[1].mappingProfile,
          collectionOfProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[1].mappingProfile.name,
        );

        // create Action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(collectionOfProfiles[0].jobProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[0].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(collectionOfProfiles[0].jobProfile.profileName);

        JobProfiles.waitLoadingList();
        cy.wait(2000);
        JobProfiles.createJobProfile(collectionOfProfiles[1].jobProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[1].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(collectionOfProfiles[1].jobProfile.profileName);

        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, fileNameForFirstImport);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(collectionOfProfiles[0].jobProfile.profileName);
        JobProfiles.selectJobProfile();
        cy.wait(1000);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForFirstImport);
        Logs.checkImportFile(collectionOfProfiles[0].jobProfile.profileName);
        LogsViewAll.verifyJobStatus(fileNameForFirstImport, JOB_STATUS_NAMES.COMPLETED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.searchByNumber(invoiceNumber);
        Invoices.selectInvoice(invoiceNumber);
        InvoiceView.verifyInvoiceNote(invoiceData[0].invoiceNote);
        InvoiceView.selectInvoiceLine();
        InvoiceView.verifyInvoiceLineSubscription(invoiceData[0].subscriptionInfo);
        InvoiceView.verifyInvoiceLineComment(invoiceData[0].comment);

        cy.getInvoiceIdApi({ query: `vendorInvoiceNo="${invoiceNumber}"` }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));

        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        TopMenuNavigation.clickToGoHomeButton();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, fileNameForSecondImport);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(collectionOfProfiles[1].jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForSecondImport);
        Logs.checkImportFile(collectionOfProfiles[1].jobProfile.profileName);
        LogsViewAll.verifyJobStatus(fileNameForSecondImport, JOB_STATUS_NAMES.COMPLETED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.searchByNumber(invoiceNumber);
        Invoices.selectInvoice(invoiceNumber);
        InvoiceView.verifyInvoiceNote(invoiceData[1].invoiceNote);
        InvoiceView.selectInvoiceLine();
        InvoiceView.verifyInvoiceLineSubscription(invoiceData[1].subscriptionInfo);
        InvoiceView.verifyInvoiceLineComment(invoiceData[1].comment);
      },
    );
  });
});
