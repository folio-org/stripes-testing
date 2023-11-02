import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';
import Orders from '../../../support/fragments/orders/orders';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const orderNumbers = [];
    const filePathForCreateOrder = 'marcFileForC376975.mrc';
    const firstMarcFileName = `C376975 autotestFileName ${getRandomPostfix()}`;
    const secondMarcFileName = `C376975 autotestFileName ${getRandomPostfix()}`;
    const thirdMarcFileName = `C376975 autotestFileName ${getRandomPostfix()}`;
    const forthMarcFileName = `C376975 autotestFileName ${getRandomPostfix()}`;
    const fundAndExpenseClassData = [
      {
        fund: 'History(HIST)',
        expenseClass: 'No value set-',
        value: '100%',
        amount: '$19.95',
      },
      {
        fund: 'African History(AFRICAHIST)',
        expenseClass: 'Electronic',
        value: '100%',
        amount: '$19.95',
      },
    ];
    const dataForChangeFundAndExpenseClass = [
      {
        fundId: '981$b',
        expenseClass: '"Electronic (Elec)"',
        value: '100',
      },
      {
        fundId: '982$b; else "History (HIST)"',
        expenseClass: '982$c',
        value: '100',
      },
      {
        fundId: '"African History (AFRICAHIST)"',
        expenseClass: '982$c; else "Electronic (Elec)"',
        value: '100',
      },
    ];
    const mappingProfile = {
      name: `C376975 Check fund & expense class mappings in Orders ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      approved: true,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      publicationDate: '264$c; else 260$c',
      publisher: '264$b; else 260$b',
      internalNote: '981$d',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      selector: '981$e',
      receivingWorkflow: 'Synchronized',
      physicalUnitPrice: '980$b',
      quantityPhysical: '980$g',
      currency: 'USD',
      createInventory: 'None',
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '028$a " " 028$b',
      productIDType: 'Publisher or distributor number',
      vendorReferenceNumber: '980$f',
      vendorReferenceType: 'Vendor order reference number',
      fundId: '981$b',
      expenseClass: '981$c',
      value: '100',
      type: '%',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C376975 Check fund & expense class mappings in Orders ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C376975 Check fund & expense class mappings in Orders ${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
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
      'C376975 Order field mapping profile: Check fund and expense class mappings (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // create mapping profile
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

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, firstMarcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileName);
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);
        cy.go('back');
        // check Fund and Expense class populated in the second POL
        FileDetails.openOrder('Created', 1);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[0]);
        FieldMappingProfileEdit.save();

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, secondMarcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(secondMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.order,
          1,
        );

        // check Fund and Expense class populated in the second POL
        FileDetails.openOrder('Created', 1);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[1]);
        FieldMappingProfileEdit.save();

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, thirdMarcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(thirdMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(thirdMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.order,
          1,
        );
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);
        cy.go('back');
        // check Fund and Expense class populated in the second POL
        FileDetails.openOrder('Created', 1);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[2]);
        FieldMappingProfileEdit.save();

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, forthMarcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(forthMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(forthMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.created,
          FileDetails.columnNameInResultList.order,
          1,
        );
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);
        cy.go('back');
        // check Fund and Expense class populated in the second POL
        FileDetails.openOrder('Created', 1);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace('-1', '');

          orderNumbers.push(orderNumber);
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);
      },
    );
  });
});
