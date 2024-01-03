import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    let orderNumber;
    const filePathForCreateOrder = 'marcBibFileForC378900.mrc';
    const marcFileName = `C378900 autotestFileName ${getRandomPostfix()}`;
    const title = 'Ella & Basie! [sound recording] / arranged by Quincy Jones.';
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

    before('create user and login', () => {
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

    after('delete test data', () => {
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
      { tags: ['extendedPath', 'folijet'] },
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.order,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
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
