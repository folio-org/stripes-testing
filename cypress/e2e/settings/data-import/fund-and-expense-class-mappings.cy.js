import {
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
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
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const filePathForCreateOrder = 'marcFileForC376975.mrc';
    const firstMarcFileName = `C376975 autotestFileName${getRandomPostfix()}.mrc`;
    const secondMarcFileName = `C376975 autotestFileName${getRandomPostfix()}.mrc`;
    const thirdMarcFileName = `C376975 autotestFileName${getRandomPostfix()}.mrc`;
    const forthMarcFileName = `C376975 autotestFileName${getRandomPostfix()}.mrc`;
    const fundAndExpenseClassData = [
      {
        fund: 'History(HIST)',
        expenseClass: RECORD_STATUSES.DASH,
        value: '100%',
        amount: '$19.95',
      },
      {
        fund: 'European History(EUROHIST)',
        expenseClass: 'Auto',
        value: '100%',
        amount: '$19.95',
      },
    ];
    const dataForChangeFundAndExpenseClass = [
      {
        fundId: '981$b',
        expenseClass: '"Auto (Auto)"',
        value: '100',
      },
      {
        fundId: '982$b; else "History (HIST)"',
        expenseClass: '982$c',
        value: '100',
      },
      {
        fundId: '"European History (EUROHIST)"',
        expenseClass: '982$c; else "Auto (Auto)"',
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

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        SettingsFieldMappingProfiles.waitLoading();
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
      'C376975 Order field mapping profile: Check fund and expense class mappings (folijet)',
      { tags: ['criticalPath', 'folijet', 'C376975'] },
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
        DataImport.uploadFile(filePathForCreateOrder, firstMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(firstMarcFileName);
        Logs.checkJobStatus(firstMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstMarcFileName);
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const orderNumber = initialNumber.replace(/-\d+$/, '');

          OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(firstMarcFileName);
          // check Fund and Expense class populated in the second POL
          FileDetails.openOrder(RECORD_STATUSES.CREATED, 1);
          OrderLines.waitLoading();
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              cy.getAdminToken();
              Orders.deleteOrderViaApi(orderId[0].id);
            },
          );
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[0]);
        FieldMappingProfileEdit.save();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, secondMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(secondMarcFileName);
        Logs.checkJobStatus(secondMarcFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(secondMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
          1,
        );
        // check Fund and Expense class populated in the second POL
        FileDetails.openOrder(RECORD_STATUSES.CREATED, 1);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          cy.wait(1000);
          const orderNumber = initialNumber.replace(/-\d+$/, '');
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              cy.getAdminToken();
              Orders.deleteOrderViaApi(orderId[0].id);
            },
          );
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[1]);
        FieldMappingProfileEdit.save();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, thirdMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(thirdMarcFileName);
        Logs.checkJobStatus(thirdMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(thirdMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
          1,
        );
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          cy.wait(1000);
          const orderNumber = initialNumber.replace(/-\d+$/, '');
          OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(thirdMarcFileName);
          // check Fund and Expense class populated in the second POL
          FileDetails.openOrder(RECORD_STATUSES.CREATED, 1);
          OrderLines.waitLoading();
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              cy.getAdminToken();
              Orders.deleteOrderViaApi(orderId[0].id);
            },
          );
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[0]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.fillFundDistriction(dataForChangeFundAndExpenseClass[2]);
        FieldMappingProfileEdit.save();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, forthMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(forthMarcFileName);
        Logs.checkJobStatus(forthMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(forthMarcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
          1,
        );
        // check Fund and Expense class populated in the first POL
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          cy.wait(1000);
          const orderNumber = initialNumber.replace(/-\d+$/, '');

          OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(forthMarcFileName);
          // check Fund and Expense class populated in the second POL
          FileDetails.openOrder(RECORD_STATUSES.CREATED, 1);
          OrderLines.waitLoading();
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              cy.getAdminToken();
              Orders.deleteOrderViaApi(orderId[0].id);
            },
          );
        });
        OrderLines.checkFundAndExpenseClassPopulated(fundAndExpenseClassData[1]);
      },
    );
  });
});
