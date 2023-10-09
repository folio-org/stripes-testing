import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Orders from '../../../support/fragments/orders/orders';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let orderNumber;
    let instanceHrid;
    const instanceTitle = 'Quiet time.';
    const filePathForCreateOrder = 'marcFileForCreateOrder.mrc';
    const marcFileName = `C380474 autotestFileName ${getRandomPostfix()}`;
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          name: `C380474 Test Physical resource open order with instance, holdings, item ${getRandomPostfix()}`,
          orderStatus: ORDER_STATUSES.OPEN,
          approved: true,
          vendor: VENDOR_NAMES.GOBI,
          title: '245$a',
          acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
          orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
          receivingWorkflow: 'Synchronized',
          physicalUnitPrice: '"20"',
          quantityPhysical: '"1"',
          currency: 'USD',
          locationName: `"${LOCATION_NAMES.ANNEX}"`,
          locationQuantityPhysical: '"1"',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          name: `C380474 Test Physical resource open order with instance, holdings, item ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C380474 Create simple holdings for open order ${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C380474 Create simple holdings for open order ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C380474 Create simple item for open order ${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C380474 Create simple item for open order${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      profileName: `C380474 Test Physical resource open order with instance, holdings, item ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
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
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((orderId) => {
        Orders.deleteOrderViaApi(orderId[0].id);
      });
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C380474 Import to create open orders: Physical resource with Instances, Holdings, Items (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.createOrderMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
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
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
          FileDetails.columnNameInResultList.order,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const polNumber = initialNumber;
          orderNumber = polNumber.replace('-1', '');

          OrderLines.checkCreatedInventoryInPhysicalRecourceDetails('Instance, Holding, Item');
          OrderLines.openLinkedInstance();
          InstanceRecordView.verifyIsInstanceOpened(instanceTitle);
          InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrid = initialInstanceHrId;
          });
          InstanceRecordView.verifyHotlinkToPOL(polNumber);
          InstanceRecordView.verifyIsHoldingsCreated([`${LOCATION_NAMES.ANNEX_UI} >`]);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.waitLoading();
          ItemRecordView.checkHotlinksToCreatedPOL(polNumber);
        });
      },
    );
  });
});
