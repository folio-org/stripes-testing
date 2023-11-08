import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import Orders from '../../../support/fragments/orders/orders';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const orderNumbers = [];
    const quantityOfOrders = '3';
    const filePathForCreateOrder = 'marcFileForC375178.mrc';
    const marcFileName = `C375178 autotestFileName ${getRandomPostfix()}`;
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

    before('login', () => {
      cy.loginAsAdmin();
      // create mapping profile
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.wrap(orderNumbers).each((number) => {
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${number}"` }).then((orderId) => {
          Orders.deleteOrderViaApi(orderId[0].id);
        });
      });
    });

    it(
      'C375178 Verify the importing of orders with pending status (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkOrderQuantityInSummaryTable(quantityOfOrders);
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfOrders);
        cy.wrap(ordersData).each((order) => {
          FileDetails.verifyTitle(
            order.title,
            FileDetails.columnNameInResultList.title,
            order.rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.order,
            order.rowNumber,
          );
          FileDetails.verifyStatusHasLinkToOrder(order.rowNumber);
          FileDetails.openOrder('Created', order.rowNumber);
          OrderLines.waitLoading();
          OrderLines.verifyOrderTitle(order.title);
          OrderLines.getAssignedPOLNumber().then((initialNumber) => {
            const orderNumber = initialNumber.replace('-1', '');

            orderNumbers.push(orderNumber);
          });
          cy.go('back');
        });
      },
    );
  });
});
