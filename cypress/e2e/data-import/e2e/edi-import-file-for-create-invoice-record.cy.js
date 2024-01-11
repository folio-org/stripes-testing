import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  INVOICE_STATUSES,
  PAYMENT_METHOD,
  VENDOR_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import permissions from '../../../support/dictionary/permissions';
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
  describe('End to end scenarios', () => {
    const quantityOfItems = '1';
    const fileName = `C343338 autotestFile.${getRandomPostfix()}.edi`;
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    let user = {};

    const mappingProfile = {
      name: `C343338 autoTestMappingProf.${getRandomPostfix()}`,
      incomingRecordType: NewFieldMappingProfile.incomingRecordType.edifact,
      typeValue: FOLIO_RECORD_TYPE.INVOICE,
      description: '',
      batchGroup: BATCH_GROUP.FOLIO,
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

    before('login', () => {
      cy.createTempUser([
        permissions.dataImportUploadAll.gui,
        permissions.moduleDataImportEnabled.gui,
        permissions.settingsDataImportEnabled.gui,
        permissions.uiOrganizationsView.gui,
        permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
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
          query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"`,
        }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C343338 EDIFACT file import with creating of new invoice record (folijet)',
      { tags: ['smoke', 'folijet'] },
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
        DataImport.uploadFile('ediFileForC343338.edi', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.invoice,
        );
        FileDetails.checkInvoiceInSummaryTable(quantityOfItems);
        FileDetails.getInvoiceNumber(vendorInvoiceNumber).then((invoiceNumber) => {
          cy.visit(TopMenu.invoicesPath);
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
