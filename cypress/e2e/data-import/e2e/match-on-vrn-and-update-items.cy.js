/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MatchOnVRN from '../../../support/fragments/data_import/matchOnVRN';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    const uniquePartOfInstanceTitle = `Cornell University Graduate School records,${getRandomPostfix()}`;
    const item = {
      title: `${uniquePartOfInstanceTitle} Jay Jordan Butler.`,
      productId: `xyz${getRandomPostfix()}`,
      vrn: uuid(),
      vrnType: 'Vendor order reference number',
      physicalUnitPrice: '20',
      quantityPhysical: '1',
      createInventory: 'Instance, holdings, item',
    };
    const itemBarcode = uuid();
    let vendorId;
    let locationId;
    let acquisitionMethodId;
    let productIdTypeId;
    let materialTypeId;
    let user = null;
    let orderNumber;
    const instanceMappingProfileName = `C350591 Update Instance by VRN match ${getRandomPostfix()}`;
    const holdingsMappingProfileName = `C350591 Update Holdings by VRN match ${getRandomPostfix()}`;
    const itemMappingProfileName = `C350591 Update Item by VRN match ${getRandomPostfix()}`;
    const instanceActionProfileName = `C350591 Action for Instance ${getRandomPostfix()}`;
    const holdingsActionProfileName = `C350591 Action for Holdings ${getRandomPostfix()}`;
    const itemActionProfileName = `C350591 Action for Item ${getRandomPostfix()}`;
    const instanceMatchProfileName = `C350591 Match for Instance ${getRandomPostfix()}`;
    const holdingsMatchProfileName = `C350591 Match for Holdings ${getRandomPostfix()}`;
    const itemMatchProfileName = `C350591 Match for Item ${getRandomPostfix()}`;
    const editedMarcFileName = `C350591 marcFile${getRandomPostfix()}.mrc`;

    const matchProfiles = [
      {
        name: instanceMatchProfileName,
        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
      {
        name: holdingsMatchProfileName,
        existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      },
      {
        name: itemMatchProfileName,
        existingRecordType: EXISTING_RECORD_NAMES.ITEM,
      },
    ];

    const jobProfilesData = {
      name: `C350591 Job profile ${getRandomPostfix()}`,
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      matches: [
        {
          matchName: instanceMatchProfileName,
          actionName: instanceActionProfileName,
        },
        {
          matchName: holdingsMatchProfileName,
          actionName: holdingsActionProfileName,
        },
        {
          matchName: itemMatchProfileName,
          actionName: itemActionProfileName,
        },
      ],
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersDelete.gui,
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
        Permissions.uiReceivingViewEditCreate.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiInventoryStorageModule.gui,
        Permissions.remoteStorageView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.getAdminToken()
            .then(() => {
              Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
                (organization) => {
                  vendorId = organization.id;
                },
              );
              cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
                materialTypeId = materialType.id;
              });
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                acquisitionMethodId = params.body.acquisitionMethods[0].id;
              });
              cy.getProductIdTypes({ query: 'name=="ISSN"' }).then((productIdType) => {
                productIdTypeId = productIdType.id;
              });
              cy.getLocations({ query: 'name="Main Library"' }).then((res) => {
                locationId = res.id;
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
            });
        });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((order) => {
          Orders.deleteOrderViaApi(order[0].id);
        });
        Users.deleteViaApi(user.userId);
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfilesData.name);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(instanceMatchProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsMatchProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(itemMatchProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(holdingsActionProfileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(itemActionProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(holdingsMappingProfileName);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(itemMappingProfileName);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
    });

    it(
      'C350591 Match on VRN and update related Instance, Holdings, Item (folijet)',
      { tags: ['smoke', 'folijet', 'C350591'] },
      () => {
        // create order with POL
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId }),
          BasicOrderLine.getDefaultOrderLine({
            quantity: item.quantityPhysical,
            title: item.title,
            specialLocationId: locationId,
            specialMaterialTypeId: materialTypeId,
            acquisitionMethod: acquisitionMethodId,
            listUnitPrice: item.physicalUnitPrice,
            poLineEstimatedPrice: item.physicalUnitPrice,
            productIds: [
              {
                productId: item.productId,
                productIdType: productIdTypeId,
              },
            ],
            referenceNumbers: [
              {
                refNumberType: item.vrnType,
                refNumber: item.vrn,
              },
            ],
          }),
        ).then((order) => {
          orderNumber = order.poNumber;
          // open the PO with POL
          cy.wait(1500);
          Orders.clearSearchField();
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.openOrder();
          Orders.selectStatusInSearch(ORDER_STATUSES.OPEN);
          OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
          OrderDetails.checkIsItemsInInventoryCreated(item.title, LOCATION_NAMES.MAIN_LIBRARY_UI);
          // check receiving pieces are created
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
          Orders.resetFilters();
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          OrderDetails.openPolDetails(item.title);
          OrderLines.openReceiving();
          Receiving.checkIsPiecesCreated(item.title);
        });

        DataImport.editMarcFile(
          'marcFileForC350591.mrc',
          editedMarcFileName,
          ['Cornell University Graduate School records,', '14567-1', 'xyzt124245271818912626262'],
          [uniquePartOfInstanceTitle, item.vrn, itemBarcode],
        );

        // create field mapping profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        MatchOnVRN.creatMappingProfilesForInstance(instanceMappingProfileName)
          .then(() => {
            MatchOnVRN.creatMappingProfilesForHoldings(holdingsMappingProfileName);
          })
          .then(() => {
            MatchOnVRN.creatMappingProfilesForItem(itemMappingProfileName);
          });

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        MatchOnVRN.createActionProfileForVRN(
          instanceActionProfileName,
          'Instance',
          instanceMappingProfileName,
        );
        MatchOnVRN.createActionProfileForVRN(
          holdingsActionProfileName,
          'Holdings',
          holdingsMappingProfileName,
        );
        MatchOnVRN.createActionProfileForVRN(itemActionProfileName, 'Item', itemMappingProfileName);

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchOnVRN.waitJSONSchemasLoad();
        matchProfiles.forEach((match) => {
          MatchOnVRN.createMatchProfileForVRN(match);
          cy.wait(3000);
        });

        // create job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        MatchOnVRN.createJobProfileForVRN(jobProfilesData);

        // import a file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfilesData.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkItemsStatusesInResultList(0, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
        ]);
        FileDetails.checkItemsStatusesInResultList(1, [
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
        ]);

        // verify Instance, Holdings and Item details
        MatchOnVRN.clickOnUpdatedHotlink();
        InventoryInstance.waitInstanceRecordViewOpened(item.title);
        MatchOnVRN.verifyInstanceUpdated();
        MatchOnVRN.verifyHoldingsUpdated();
        InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
        MatchOnVRN.verifyItemUpdated(itemBarcode);
        InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
        MatchOnVRN.verifyMARCBibSource(itemBarcode);
      },
    );
  });
});
