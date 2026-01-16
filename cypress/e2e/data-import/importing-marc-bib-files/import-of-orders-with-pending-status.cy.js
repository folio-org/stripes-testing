import {
  ACQUISITION_METHOD_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_SOURCE_NAMES,
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let orderNumber;
    const quantityOfOrders = '2';
    const filePathForCreateOrder = 'marcFileForC375174.mrc';
    const marcFileName = `C375174 autotestFileName${getRandomPostfix()}.mrc`;
    const orderData = {
      title: 'ROALD DAHL : TELLER OF THE UNEXPECTED : A BIOGRAPHY.',
      publicationDate: '2023',
      publisher: 'PEGASUS BOOKS',
      internalNote: 'AAH/bsc ',
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receiptStatus: 'Pending',
      paymentStatus: 'Pending',
      source: INSTANCE_SOURCE_NAMES.MARC,
      selector: 'AAH',
      receivingWorkflow: 'Synchronized order and receipt quantity',
      accountNumber: '137009',
      physicalUnitPrice: '$27.95',
      quantityPhysical: '1',
      currency: 'USD',
      materialSupplier: VENDOR_NAMES.GOBI,
      createInventory: 'Instance, Holding, Item',
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      contributor: 'DENNISON, MATTHEW',
      contributorType: 'Personal name',
      productId: '9781639363322',
      productIDType: 'ISBN',
      vendorReferenceNumber: '99992466210',
      vendorReferenceType: 'Vendor order reference number',
      fund: 'Gifts (Non-recurring)(GIFTS-ONE-TIME)',
      value: '100%',
      locationName: 'Main Library (KU/CC/DI/M)',
      locationQuantityPhysical: '1',
    };
    const mappingProfile = {
      name: `C375174 Test Order ${getRandomPostfix()}`,
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
      name: `C375174 Test Order ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C375174 Test Order ${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((orderId) => {
          cy.wait(3000);
          Orders.deleteOrderViaApi(orderId[0].id);
        });
      });
    });

    it(
      'C375174 Verify the importing of orders with pending status (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375174'] },
      () => {
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
          0,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
          1,
        );
        FileDetails.checkOrderQuantityInSummaryTable(quantityOfOrders);
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.checkIsOrderCreatedWithDataFromImportedFile(orderData);
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const polNumber = initialNumber;
          orderNumber = polNumber.replace(/-\d+$/, '');
        });
      },
    );
  });
});
