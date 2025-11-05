import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
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
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let orderNumber;
    let instanceHRID;
    const filePathForCreate = 'marcFileForC388570.mrc';
    const marcFileName = `C388570 autotestFileName${getRandomPostfix()}.mrc`;
    const arrayOfHoldingsStatuses = ['Created (KU/CC/DI/M)', 'Created (E)', 'Created (KU/CC/DI/A)'];
    const quantityOfCreatedHoldings = 3;
    const quantityOfCreatedItems = '6';
    const holdingsData = [
      { permanentLocation: LOCATION_NAMES.MAIN_LIBRARY_UI, itemsQuqntity: 3 },
      { permanentLocation: LOCATION_NAMES.ANNEX_UI, itemsQuqntity: 2 },
      { permanentLocation: LOCATION_NAMES.ONLINE_UI, itemsQuqntity: 1 },
    ];
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          name: `C388570 Physical open order for multiple.${getRandomPostfix()}`,
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
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          locationName: `"${LOCATION_NAMES.ANNEX}"`,
          locationQuantityPhysical: '"1"',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          name: `C388570 Physical open order for multiple.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C388570 Test multiple holdings.${getRandomPostfix()}`,
          permanentLocation: '945$h',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C388570 Test multiple holdings.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C388570 Test multiple items.${getRandomPostfix()}`,
          materialType: '945$a',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.ON_ORDER,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C388570 Test multiple items.${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      profileName: `C388570 Physical open order for multiple.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
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
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
            instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((orderId) => {
          Orders.deleteOrderViaApi(orderId[0].id);
        });
      });
    });

    it(
      'C388570 Check the log result table for imported multiple items and holdings for Physical resource open order (folijet)',
      { tags: ['criticalPath', 'folijet', 'C388570'] },
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
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreate, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.order,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');
        FileDetails.checkHoldingsQuantityInSummaryTable('3');
        FileDetails.checkItemQuantityInSummaryTable('6');
        FileDetails.checkOrderQuantityInSummaryTable('1');
        FileDetails.verifyMultipleItemsStatus(Number(quantityOfCreatedItems));
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          const polNumber = initialNumber;
          orderNumber = polNumber.replace(/-\d+$/, '');
        });
        OrderLines.checkQuantityPhysical('1');
        OrderLines.checkPhysicalQuantityInLocation(1);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(marcFileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
        holdingsData.forEach((holdings) => {
          InventoryInstance.checkIsHoldingsCreated([`${holdings.permanentLocation} >`]);
          InventoryInstance.openHoldingsAccordion(`${holdings.permanentLocation} >`);
          InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
            holdings.permanentLocation,
            holdings.itemsQuqntity,
          );
        });
      },
    );
  });
});
