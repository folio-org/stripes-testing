import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let orderNumber;
    const filePathForCreateOrder = 'marcBibFileForC378900.mrc';
    const marcFileName = `C378900 autotestFileName${getRandomPostfix()}.mrc`;
    const title = 'Ella & Basie!';
    const productInfoJson = {
      productId: '"productId": "T90028"',
      productIdType: '"productIdType": "b5d8cdc4-9441-487c-90cf-0c7ec97728eb"',
    };
    const productInfoUi = {
      productId: 'T90028',
      productIdType: 'Publisher or distributor number',
    };
    const mappingProfile = {
      name: `C378900 Test multiple Product ID types: Pub Num first${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receivingWorkflow: 'Synchronized',
      physicalUnitPrice: '"1"',
      quantityPhysical: '"1"',
      currency: 'USD',
      createInventory: 'None',
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '028$a',
      qualifier: '',
      productIDType: 'Publisher or distributor number',
    };
    const additionalProduct = {
      id: '020$a',
      qualifier: '020$q',
      idType: 'ISBN',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C378900 Test multiple Product ID types: Pub Num first${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C378900 Test multiple Product ID types: Pub Num first${getRandomPostfix()}`,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
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
          Orders.deleteOrderViaApi(orderId[0].id);
        });
      });
    });

    function createMappingProfile(profile, product) {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillOrderMappingProfile(profile);
      NewFieldMappingProfile.addAdditionalProductInfo(product);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    }

    it(
      'C378900 Verify no errors when importing orders with multiple product ID types mapped: Case 2 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'eurekaPhase1'] },
      () => {
        // create mapping profile
        createMappingProfile(mappingProfile, additionalProduct);
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
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openOrderTab();
        JsonScreenView.verifyContentInTab(productInfoJson.productId);
        JsonScreenView.verifyContentInTab(productInfoJson.productIdType);
        JsonScreenView.getOrderNumber().then((number) => {
          orderNumber = number;
        });
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileName);
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.verifyProductIdentifier(productInfoUi.productId, productInfoUi.productIdType);
      },
    );
  });
});
