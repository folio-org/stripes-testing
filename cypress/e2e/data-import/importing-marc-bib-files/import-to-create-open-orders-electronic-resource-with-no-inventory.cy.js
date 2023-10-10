import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  ORDER_FORMAT_NAMES,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
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
import Orders from '../../../support/fragments/orders/orders';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let orderNumber;
    const quantityOfItems = '1';
    const filePathForCreateOrder = 'marcFileForC380483.mrc';
    const marcFileName = `C380483 autotestFileName.${getRandomPostfix()}`;
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C380483 Test Electronic resource open order ${getRandomPostfix()}`,
      orderStatus: ORDER_STATUSES.OPEN,
      approved: true,
      vendor: 'GOBI Library Solutions',
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE_Check,
      receivingWorkflow: 'Synchronized',
      currency: 'USD',
      electronicUnitPrice: '"25"',
      quantityElectronic: '"1"',
      locationName: `"${LOCATION_NAMES.ANNEX}"`,
      locationQuantityElectronic: '"1"',
    };
    const actionProfile = {
      name: `C380483 Test Electronic resource open order ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C380483 Test Order ${getRandomPostfix()}`,
    };

    before('login', () => {
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

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((orderId) => {
        Orders.deleteOrderViaApi(orderId[0].id);
      });
    });

    it(
      'C380483 Import to create open orders: Electronic resource with NO inventory (folijet)',
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
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkOrderQuantityInSummaryTable(quantityOfItems);
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          orderNumber = initialNumber.replace('-1', '');
        });
        OrderLines.checkCreatedInventoryInElectronicRecourceDetails('None');
      },
    );
  });
});
