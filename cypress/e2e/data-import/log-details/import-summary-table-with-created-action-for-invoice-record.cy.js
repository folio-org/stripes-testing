import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  VENDOR_NAMES,
  RECORD_STATUSES,
  INVOICE_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import { InvoiceView, Invoices } from '../../../support/fragments/invoices';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const vendorInvoiceNumber = '94959';
    const quantityOfItems = '1';
    const filePathToUpload = 'ediFileForC353625.edi';
    const fileName = `C353625 autotestFile.${getRandomPostfix()}.edi`;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    const mappingProfile = {
      name: `C353625 autoTestMappingProf.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
      organizationName: VENDOR_NAMES.GOBI,
      paymentMethod: PAYMENT_METHOD.CASH,
    };
    const actionProfile = {
      name: `C353625 autoTestActionProf.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C353625 autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.EDIFACT,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiOrganizationsView.gui,
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
        // clean up generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.getInvoiceIdApi({
          query: `vendorInvoiceNo="${vendorInvoiceNumber}"`,
        }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C353625 Check import summary table with "Created" action for invoice record (folijet) (TaaS)',
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
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.invoice,
        );

        // check Created counter in the Summary table
        FileDetails.checkInvoiceInSummaryTable(quantityOfItems, 0);
        // check Updated counter in the Summary table
        FileDetails.checkInvoiceInSummaryTable('0', 1);
        // check No action counter in the Summary table
        FileDetails.checkInvoiceInSummaryTable('0', 2);
        // check Error counter in the Summary table
        FileDetails.checkInvoiceInSummaryTable('0', 3);
        FileDetails.checkErrorQuantityInSummaryTable('0', 3);

        cy.visit(TopMenu.invoicesPath);
        Invoices.searchByNumber(vendorInvoiceNumber);
        Invoices.selectInvoice(vendorInvoiceNumber);
        InvoiceView.verifyStatus(INVOICE_STATUSES.OPEN);
      },
    );
  });
});
