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
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const orderNumbers = [];
    const quantityOfOrders = '3';
    const filePathForCreateOrder = 'marcFileForC375178.mrc';
    const marcFileName = `C375178 autotestFileName${getRandomPostfix()}.mrc`;
    const ordersData = [
      { title: 'ROALD DAHL : TELLER OF THE UNEXPECTED : A BIOGRAPHY.', rowNumber: 0 },
      { title: 'CULTURAL HISTORY OF IDEAS', rowNumber: 1 },
      { title: 'BOAT PEOPLE; TRANS. BY VANESSA PERE-ROSARIO.', rowNumber: 2 },
    ];
    const mappingProfile = {
      name: `C375178 Test Order ${getRandomPostfix()}`,
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
      name: `C375178 Test Order ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C375178 Test Order ${getRandomPostfix()}`,
    };

    before('Create test data', () => {
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

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        orderNumbers.forEach((orderNumber) => {
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              if (orderId.totalRecords > 0) {
                Orders.deleteOrderViaApi(orderId[0].id);
              }
            },
          );
        });
      });
    });

    it(
      'C375178 Verify the log details for created imported order records (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375178'] },
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
        ordersData.forEach((order) => {
          FileDetails.verifyTitle(
            order.title,
            FileDetails.columnNameInResultList.title,
            order.rowNumber,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.order,
            order.rowNumber,
          );
          FileDetails.verifyStatusHasLinkToOrder(order.rowNumber);
          FileDetails.openOrder(RECORD_STATUSES.CREATED, order.rowNumber);
          OrderLines.waitLoading();
          OrderLines.verifyOrderTitle(order.title);
          OrderLines.getAssignedPOLNumber().then((initialNumber) => {
            const orderNumber = initialNumber.replace(/-\d+$/, '');

            orderNumbers.push(orderNumber);
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(marcFileName);
        });
      },
    );
  });
});
