/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXISTING_RECORDS_NAMES,
  ORDER_STATUSES,
  VENDOR_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const item = {
      title: 'Agrarianism and capitalism in early Georgia, 1732-1743 / Jay Jordan Butler.',
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
    const editedMarcFileName = `marcFileForC350591.${getRandomPostfix()}.mrc`;

    const matchProfiles = [
      {
        name: instanceMatchProfileName,
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
      {
        name: holdingsMatchProfileName,
        existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      },
      {
        name: itemMatchProfileName,
        existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
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
      cy.getAdminToken().then(() => {
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((order) => {
          Orders.deleteOrderViaApi(order[0].id);
        });
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
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
      { tags: ['smoke', 'folijet', 'nonParallel'] },
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

          Orders.resetFilters();
          Orders.checkIsOrderCreated(orderNumber);
          // open the first PO with POL
          Orders.resetFilters();
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.openOrder();
          Orders.selectStatusInSearch(ORDER_STATUSES.OPEN);
          OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
          OrderDetails.checkIsItemsInInventoryCreated(item.title, 'Main Library');
          // check receiving pieces are created
          cy.visit(TopMenu.ordersPath);
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
          ['14567-1', 'xyzt124245271818912626262'],
          [item.vrn, itemBarcode],
        );

        // create field mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        MatchOnVRN.creatMappingProfilesForInstance(instanceMappingProfileName)
          .then(() => {
            MatchOnVRN.creatMappingProfilesForHoldings(holdingsMappingProfileName);
          })
          .then(() => {
            MatchOnVRN.creatMappingProfilesForItem(itemMappingProfileName);
          });

        // create action profiles
        cy.visit(SettingsMenu.actionProfilePath);
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
        cy.visit(SettingsMenu.matchProfilePath);
        MatchOnVRN.waitJSONSchemasLoad();
        matchProfiles.forEach((match) => {
          MatchOnVRN.createMatchProfileForVRN(match);
        });

        // create job profiles
        cy.visit(SettingsMenu.jobProfilePath);
        MatchOnVRN.createJobProfileForVRN(jobProfilesData);

        // import a file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfilesData.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkItemsStatusesInResultList(0, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
        ]);
        FileDetails.checkItemsStatusesInResultList(1, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
        ]);

        // verify Instance, Holdings and Item details
        MatchOnVRN.clickOnUpdatedHotlink();
        InventoryInstance.waitInstanceRecordViewOpened(item.title);
        MatchOnVRN.verifyInstanceUpdated();
        MatchOnVRN.verifyHoldingsUpdated();
        MatchOnVRN.verifyItemUpdated(itemBarcode);
        MatchOnVRN.verifyMARCBibSource(itemBarcode);
      },
    );
  });
});
