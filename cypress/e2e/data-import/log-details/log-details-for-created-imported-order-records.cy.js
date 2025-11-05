import {
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const quantityOfOrders = '7';
    const filePathForCreateOrder = 'marcFileForC376973.mrc';
    const marcFileName = `C376973 autotestFileName${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      name: `C376973 mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      approved: true,
      vendor: VENDOR_NAMES.GOBI,
      reEncumber: 'false',
      title: '245$a',
      mustAcknowledgeReceivingNote: 'false',
      publicationDate: '264$c; else 260$c',
      publisher: '264$b; else 260$b',
      edition: '250$a',
      internalNote: '981$d',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receiptStatus: 'Pending',
      paymentStatus: 'Pending',
      selector: '981$e',
      cancellationRestriction: 'false',
      rush: '981$h',
      receivingWorkflow: 'Synchronized',
      accountNumber: '981$g',
      physicalUnitPrice: '980$b',
      quantityPhysical: '980$g',
      currency: 'USD',
      materialSupplier: VENDOR_NAMES.GOBI,
      createInventory: 'Instance, Holding, Item',
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '020$a',
      qualifier: '020$q',
      productIDType: 'ISBN',
      vendorReferenceNumber: '980$f',
      vendorReferenceType: 'Vendor order reference number',
      fundId: '981$b',
      expenseClass: '981$c',
      value: '100',
      type: '%',
      locationName: '049$a',
      locationQuantityPhysical: '980$g',
      volume: '993$a',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C376973 action profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C376973 job profile ${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create mapping profile
      FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create action profile
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      SettingsActionProfiles.create(actionProfile, mappingProfile.name);
      SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C376973 Verify the log details for created imported order records (folijet)',
      { tags: ['criticalPath', 'folijet', 'C376973'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkOrderQuantityInSummaryTable(quantityOfOrders);
        FileDetails.verifyRecordColumnHasStandardSequentialNumberingForRecords();
        [0, 1, 2, 3, 4, 5, 6].forEach((rowNumber) => {
          FileDetails.verifyTitleHasLinkToJsonFile(rowNumber);
          FileDetails.verifyStatusHasLinkToOrder(rowNumber);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.order,
            rowNumber,
          );
          FileDetails.openOrder(RECORD_STATUSES.CREATED, rowNumber);
          OrderLines.waitLoading();
          OrderLines.getAssignedPOLNumber().then((initialNumber) => {
            const orderNumber = initialNumber.replace(/-\d+$/, '');

            Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
              (orderId) => {
                Orders.deleteOrderViaApi(orderId[0].id);
              },
            );
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(marcFileName);
        });
      },
    );
  });
});
