import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingEditForm } from '../../support/fragments/receiving';
import DeleteHoldingsModal from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import RemoveFromPackageModal from '../../support/fragments/receiving/modals/removeFromPackageModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      title1: `AT_C770416_Title1_${postfix}`,
      title2: `AT_C770416_Title2_${postfix}`,
      packageName: `AT_C770416_Package_${postfix}`,
      packagePiece1Barcode: `AT_C770416_PackagePiece1_Barcode_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.location1, testData.location2] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Order #1: "One-time" order with two synchronized PO lines for newly created titles
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.oneTimeOrder = order;

        [testData.title1, testData.title2].forEach((title, index) => {
          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              title,
              purchaseOrderId: order.id,
              specialLocationId: testData.location1.id,
              specialMaterialTypeId: testData.materialType.id,
              acquisitionMethod: testData.acquisitionMethod.id,
            }),
          ).then((orderLine) => {
            testData[`oneTimeOrderLine${index + 1}`] = orderLine;
          });
        });
        cy.then(() => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Instances and "Loc 1" holdings created on opening Order #1
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.oneTimeOrderLine1.id).then((orderLine) => {
        testData.instance1Id = orderLine.instanceId;
        testData.instance1HoldingId = orderLine.locations[0].holdingId;
      });
      OrderLines.getOrderLineByIdViaApi(testData.oneTimeOrderLine2.id).then((orderLine) => {
        testData.instance2Id = orderLine.instanceId;
      });
    });

    // Order #2: "Ongoing" order with package PO line, Title #1 and Title #2 added to "Package titles"
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.packageOrder = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          isPackage: true,
          titleOrPackage: testData.packageName,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location1.id, quantity: 1, quantityPhysical: 1 }],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        }).then((orderLine) => {
          testData.packageOrderLine = orderLine;

          OrderLines.addPackageTitleViaApi({
            title: testData.title1,
            poLineId: orderLine.id,
            instanceId: testData.instance1Id,
          }).then(({ body: title }) => {
            testData.packageTitle1Id = title.id;
          });
          OrderLines.addPackageTitleViaApi({
            title: testData.title2,
            poLineId: orderLine.id,
            instanceId: testData.instance2Id,
          }).then(({ body: title }) => {
            testData.packageTitle2Id = title.id;
          });
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.then(() => {
      const pieceDefaults = {
        ...NewPiece.defaultPiece,
        poLineId: testData.packageOrderLine.id,
      };

      // Piece for Title #1 with item in existing "Loc 1" holding related to Order #1
      // (barcode tells the package item apart from Order #1 item, which has no barcode)
      Pieces.upsertOrderPiecesBatchViaApi(
        [
          {
            ...pieceDefaults,
            id: uuid(),
            titleId: testData.packageTitle1Id,
            holdingId: testData.instance1HoldingId,
            barcode: testData.packagePiece1Barcode,
          },
        ],
        { createItem: true },
      );
      // Piece for Title #2 with item in new "Loc 2" holding
      Pieces.upsertOrderPiecesBatchViaApi(
        [
          {
            ...pieceDefaults,
            id: uuid(),
            titleId: testData.packageTitle2Id,
            locationId: testData.location2.id,
          },
        ],
        { createItem: true },
      );
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingDelete,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.packageOrder.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.packageOrder.id);
    Orders.deleteOrderViaApi(testData.oneTimeOrder.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance1Id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance2Id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C770416 Unlink title from package when related holding contains an item linked to another order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C770416'] },
    () => {
      // Step 1: Click on the Order number and click on the record in "PO lines" accordion
      Orders.selectFromResultsList(testData.packageOrder.poNumber);
      OrderDetails.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(2);
      OrderLines.verifyPackageTitleExists(testData.title1);
      OrderLines.verifyPackageTitleExists(testData.title2);

      // Step 2: Click on the Title #1 row (but NOT on hyperlink in Title column)
      OrderLines.clickPackageTitleRow(testData.title1);
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.checkItemDetailsFields({ title: testData.title1 });
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed();

      // Step 3: Click "Remove from package" button
      ReceivingEditForm.clickRemoveFromPackageButton();
      RemoveFromPackageModal.verifyModalView();

      // Step 4: Click "Confirm" button in "Remove from package" pop up
      RemoveFromPackageModal.clickConfirmButton();
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(1);
      OrderLines.verifyPackageTitleExists(testData.title2);
      OrderLines.verifyPackageTitleExists(testData.title1, false);

      // Step 5: Click on the Title #2 row (but NOT on hyperlink in Title column)
      OrderLines.clickPackageTitleRow(testData.title2);
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.checkItemDetailsFields({ title: testData.title2 });
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed();

      // Step 6: Click "Remove from package" button and click "Confirm" button
      ReceivingEditForm.clickRemoveFromPackageButton();
      RemoveFromPackageModal.verifyModalView();
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });

      // Step 7: Click "Keep Holdings" button ("Delete Holdings" pop up content is verified before click)
      DeleteHoldingsModal.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
        message: RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.SUCCESS);
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(0);

      // Step 8: Navigate to the "Inventory" app and search for the Title #1
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.title1);
      InventoryInstances.selectInstanceByTitle(testData.title1);
      InventoryInstance.verifyInstanceTitle(testData.title1);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 1 });
      // remaining item is the Order #1 item (no barcode), package piece item was deleted
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [{ barcode: 'No barcode', status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.verifyAcquisitionAccordionOrderLineLink(
        testData.oneTimeOrderLine1.poLineNumber,
      );

      // Step 9: Search for the Title #2
      InventoryInstances.searchByTitle(testData.title2);
      InventoryInstances.selectInstanceByTitle(testData.title2);
      InventoryInstance.verifyInstanceTitle(testData.title2);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 1 });
      // Order #1 item; package piece item was in "Loc 2" holding, which now has no items
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [{ barcode: 'No barcode', status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 0 });
      InventoryInstance.verifyAcquisitionAccordionOrderLineLink(
        testData.oneTimeOrderLine2.poLineNumber,
      );
    },
  );
});
