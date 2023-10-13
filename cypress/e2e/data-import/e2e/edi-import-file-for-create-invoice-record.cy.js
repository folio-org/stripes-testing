import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INVOICE_STATUSES,
  PAYMENT_METHOD,
  BATCH_GROUP,
  ACCEPTED_DATA_TYPE_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import { Invoices, InvoiceView } from '../../../support/fragments/invoices';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import Users from '../../../support/fragments/users/users';

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
      // clean up generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.getInvoiceIdApi({
        query: `vendorInvoiceNo="${FileDetails.invoiceNumberFromEdifactFile}"`,
      }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343338 EDIFACT file import with creating of new invoice record (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
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
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
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
