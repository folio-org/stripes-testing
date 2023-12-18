import {
  ACCEPTED_DATA_TYPE_NAMES,
  BATCH_GROUP,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  PAYMENT_METHOD,
  VENDOR_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
    const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.gobi;
    const filePathForUpload = 'ediFileForC345356.edi';
    const fileName = `C345356 autotestFile.${getRandomPostfix()}.edi`;
    const invoiceNumber = '19353';
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

    before('login', () => {
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
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
        Invoices.deleteInvoiceViaActions();
        Invoices.confirmInvoiceDeletion();
        cy.loginAsAdmin();
        cy.visit(SettingsMenu.acquisitionUnitsPath);
        AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
        AcquisitionUnits.delete(defaultAcquisitionUnit.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C345356 Acquisitions unit causes Invoices to Import with errors (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        AcquisitionUnits.newAcquisitionUnit();
        AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
        // Need to wait until data will be loaded
        cy.wait(2000);
        AcquisitionUnits.assignUser(user.username);

        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
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

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkImportFile(jobProfile.profileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.verifyEachInvoiceStatusInColunm(RECORD_STATUSES.CREATED);
        FileDetails.checkInvoiceInSummaryTable(quantityOfItems);

        cy.visit(TopMenu.invoicesPath);
        Invoices.searchByNumber(invoiceNumber);
        Invoices.selectInvoice(invoiceNumber);
        InvoiceView.verifyAcquisitionUnits(defaultAcquisitionUnit.name);
      },
    );
  });
});
