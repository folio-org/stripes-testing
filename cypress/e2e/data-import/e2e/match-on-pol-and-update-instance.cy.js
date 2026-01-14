import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'End to end scenarios',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user = null;
      let orderNumber;
      let instanceHrid;
      const itemBarcode = uuid();
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      const instanceTitle =
        'South Asian texts in history : critical engagements with Sheldon Pollock. edited by Yigal Bronner, Whitney Cox, and Lawrence McCrea.';
      let nameMarcFileForCreate;
      let editedMarcFileName;
      let marcFileName;

      let collectionOfProfiles;
      let matchProfile;
      let jobProfile;

      const order = {
        ...NewOrder.defaultOneTimeOrder,
        vendor: VENDOR_NAMES.GOBI,
        orderType: 'One-time',
      };

      const pol = {
        title: 'Sport and sociology. Dominic Malcolm.',
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        quantity: '1',
        price: '20',
        materialType: MATERIAL_TYPE_NAMES.BOOK,
        createInventory: 'None',
      };

      beforeEach('Create test user and login', () => {
        // unique file names
        nameMarcFileForCreate = `C350944 autotestFile${getRandomPostfix()}.mrc`;
        editedMarcFileName = `C350944 marcFileForMatchOnPol${getRandomPostfix()}.mrc`;
        marcFileName = `C350944 autotestFile${getRandomPostfix()}.mrc`;

        collectionOfProfiles = [
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.INSTANCE,
              name: `C350944 Update Instance by POL match ${getRandomPostfix()}`,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.INSTANCE,
              name: `C350944 Update Instance by POL match ${getRandomPostfix()}`,
              action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
            },
          },
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C350944 Create Holdings by POL match ${getRandomPostfix()}`,
              callNumberType: `"${CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS}"`,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C350944 Create Holdings by POL match ${getRandomPostfix()}`,
            },
          },
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C350944 Create Item by POL match ${getRandomPostfix()}`,
              status: ITEM_STATUS_NAMES.AVAILABLE,
              permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
              materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C350944 Create Item by POL match ${getRandomPostfix()}`,
            },
          },
        ];

        matchProfile = {
          profileName: `C350944 935 $a POL to Instance POL ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '935',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.pol,
        };

        jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C350944 Update Instance, and create Holdings, Item based on POL match ${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersApprovePurchaseOrders.gui,
          Permissions.uiInventoryViewCreateEditHoldings.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        cy.getAdminToken().then(() => {
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              Orders.deleteOrderViaApi(orderId[0].id);
            },
          );
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (initialInstance) => {
              cy.deleteItemViaApi(initialInstance.items[0].id);
              cy.deleteHoldingRecordViaApi(initialInstance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(initialInstance.id);
            },
          );
          cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` }).then(
            (instance) => {
              if (instance) {
                InventoryInstance.deleteInstanceViaApi(instance.id);
              }
            },
          );
          // delete generated profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          collectionOfProfiles.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
          Users.deleteViaApi(user.userId);
        });
      });

      const createInstanceMappingProfile = (instanceMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
        NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
        NewFieldMappingProfile.fillInstanceStatusTerm();
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
      };

      const createHoldingsMappingProfile = (holdingsMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
        NewFieldMappingProfile.fillHoldingsType(HOLDINGS_TYPE_NAMES.MONOGRAPH);
        NewFieldMappingProfile.fillPermanentLocation('980$a');
        NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfile.callNumberType);
        NewFieldMappingProfile.fillCallNumber('980$b " " 980$c');
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);
      };

      const createItemMappingProfile = (itemMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
        NewFieldMappingProfile.fillBarcode('981$b');
        NewFieldMappingProfile.fillCopyNumber('981$a');
        NewFieldMappingProfile.fillStatus(`"${itemMappingProfile.status}"`);
        NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
        NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
      };

      it(
        'C350944 Match on POL and update related Instance with source MARC, create Holdings, Item records. (folijet)',
        { tags: ['criticalPath', 'folijet', 'C350944', 'shiftLeft'] },
        () => {
          // create mapping profiles
          createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfProfiles[0].mappingProfile.name,
          );
          createHoldingsMappingProfile(collectionOfProfiles[1].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfProfiles[1].mappingProfile.name,
          );
          createItemMappingProfile(collectionOfProfiles[2].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfProfiles[2].mappingProfile.name,
          );

          // create action profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          collectionOfProfiles.forEach((profile) => {
            SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
            SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          });

          // create match profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create job profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfile);
          NewJobProfile.linkMatchAndThreeActionProfiles(
            matchProfile.profileName,
            collectionOfProfiles[0].actionProfile.name,
            collectionOfProfiles[1].actionProfile.name,
            collectionOfProfiles[2].actionProfile.name,
          );
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload a marc file for creating of the new instance, holding and item
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile('marcFileForC350944.mrc', nameMarcFileForCreate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(nameMarcFileForCreate);
          Logs.openFileDetails(nameMarcFileForCreate);
          FileDetails.checkItemsStatusesInResultList(0, [
            RECORD_STATUSES.CREATED,
            RECORD_STATUSES.CREATED,
          ]);
          FileDetails.checkItemsStatusesInResultList(1, [
            RECORD_STATUSES.CREATED,
            RECORD_STATUSES.CREATED,
          ]);

          // create PO with POL
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
          Orders.selectOrdersPane();
          Orders.createOrder(order, true).then((orderId) => {
            Orders.getOrdersApi({ limit: 1, query: `"id"=="${orderId}"` }).then((res) => {
              orderNumber = res[0].poNumber;

              OrderLines.addPolToOrder({
                title: pol.title,
                method: pol.acquisitionMethod,
                format: pol.orderFormat,
                price: pol.price,
                quantity: pol.quantity,
                inventory: pol.createInventory,
                materialType: pol.materialType,
              });
              OrderLines.backToEditingOrder();
              Orders.openOrder();

              // change file using order number
              DataImport.editMarcFile(
                'marcFileForC350944.mrc',
                editedMarcFileName,
                ['test', '242451241241'],
                [orderNumber, itemBarcode],
              );
            });
          });

          // upload .mrc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.checkIsLandingPageOpened();
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, marcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFileName);
          Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFileName);
          FileDetails.checkItemsStatusesInResultList(0, [
            RECORD_STATUSES.UPDATED,
            RECORD_STATUSES.UPDATED,
            RECORD_STATUSES.CREATED,
            RECORD_STATUSES.CREATED,
          ]);
          FileDetails.checkItemsStatusesInResultList(1, [
            RECORD_STATUSES.NO_ACTION,
            RECORD_STATUSES.NO_ACTION,
          ]);

          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrid = initialInstanceHrId;
          });
          InventoryInstance.checkIsInstanceUpdated();
          InventoryInstance.checkIsHoldingsCreated([`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`]);
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
          InventoryInstance.checkIsItemCreated(itemBarcode);
          InventoryInstance.viewSource();
          InventoryViewSource.verifyBarcodeInMARCBibSource(itemBarcode);
        },
      );
    },
  );
});
