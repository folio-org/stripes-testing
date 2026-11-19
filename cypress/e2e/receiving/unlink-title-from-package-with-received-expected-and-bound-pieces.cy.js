import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
  RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, ReceivingEditForm, Receivings } from '../../support/fragments/receiving';
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
    const getPiece = (index) => ({
      id: uuid(),
      displaySummary: `AT_C736743_Piece${index}_${postfix}`,
      barcode: `AT_C736743_Piece${index}_Barcode_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C736743_FolioInstance_${postfix}`,
      packageName: `AT_C736743_Package_${postfix}`,
      nonPackageTitle: `AT_C736743_NonPackageTitle_${postfix}`,
      boundItemBarcode: `AT_C736743_BoundItem_Barcode_${postfix}`,
      boundPiece1: getPiece(1),
      boundPiece2: getPiece(2),
      receivedPiece: getPiece(3),
      expectedPiece: getPiece(4),
    };
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getLoanTypes({ limit: 1 }).then(([loanType]) => {
      testData.loanType = loanType;
    });
    cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
      testData.instanceType = instanceType;
    });
    cy.getHoldingTypes({ limit: 1 }).then(([holdingType]) => {
      testData.holdingType = holdingType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Instance with one "Loc 1" holding
    cy.then(() => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: { instanceTypeId: testData.instanceType.id, title: testData.instanceTitle },
        holdings: [
          { holdingsTypeId: testData.holdingType.id, permanentLocationId: testData.location.id },
        ],
      }).then((instance) => {
        testData.instance = instance;
      });
    });

    // "Ongoing" order with package PO line #1 (Bindery active) and non-package PO line #2
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          isPackage: true,
          titleOrPackage: testData.packageName,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
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
            title: testData.instanceTitle,
            poLineId: orderLine.id,
            instanceId: testData.instance.instanceId,
          }).then(({ body: title }) => {
            testData.titleId = title.id;
          });
        });
        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: testData.nonPackageTitle,
            purchaseOrderId: order.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            acquisitionMethod: testData.acquisitionMethod.id,
          }),
        ).then((orderLine) => {
          testData.nonPackageOrderLine = orderLine;
        });
        cy.then(() => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Instance created for PO line #2 on opening the order
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.nonPackageOrderLine.id).then((orderLine) => {
        testData.nonPackageInstanceId = orderLine.instanceId;
      });
    });

    cy.then(() => {
      const { boundPiece1, boundPiece2, receivedPiece, expectedPiece } = testData;
      const existingHoldingId = testData.instance.holdingIds[0].id;

      // Pieces #1-4 with related items in existing "Loc 1" holding
      [boundPiece1, boundPiece2, receivedPiece, expectedPiece].forEach((piece) => {
        Receivings.addPieceViaApi(
          {
            poLineId: testData.packageOrderLine.id,
            poLineNumber: testData.packageOrderLine.poLineNumber,
            format: testData.packageOrderLine.orderFormat,
            holdingId: existingHoldingId,
            searchParams: { createItem: true },
          },
          { ...piece, titleId: testData.titleId },
        );
      });
      // Pieces #1-3 are received, Piece #4 remains "Expected"
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: testData.packageOrderLine.id,
          pieces: [boundPiece1, boundPiece2, receivedPiece].map(({ id }) => ({ id })),
        });
      });
      // Pieces #1 and #2 are bound in existing "Loc 1" holding
      cy.then(() => {
        Pieces.bindPiecesViaApi({
          bindItem: {
            barcode: testData.boundItemBarcode,
            holdingId: existingHoldingId,
            materialTypeId: testData.materialType.id,
            permanentLoanTypeId: testData.loanType.id,
          },
          bindPieceIds: [boundPiece1.id, boundPiece2.id],
          instanceId: testData.instance.instanceId,
          poLineId: testData.packageOrderLine.id,
        });
      });
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
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchByTitle(testData.instanceTitle);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.nonPackageInstanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C736743 Unlink title from Package with received, expected and bound pieces (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C736743'] },
    () => {
      const { boundPiece1, boundPiece2, receivedPiece, expectedPiece } = testData;

      // Step 1: Click on the Instance from Preconditions #1
      InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 5 });
      InventoryInstance.checkHoldingsTableContent({ name: testData.location.name });
      InventoryInstance.checkItemStatusByBarcode(
        testData.boundItemBarcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      InventoryInstance.checkItemStatusByBarcode(
        receivedPiece.barcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      InventoryInstance.checkItemStatusByBarcode(
        boundPiece1.barcode,
        ITEM_STATUS_NAMES.UNAVAILABLE,
      );
      InventoryInstance.checkItemStatusByBarcode(
        boundPiece2.barcode,
        ITEM_STATUS_NAMES.UNAVAILABLE,
      );
      InventoryInstance.checkItemStatusByBarcode(expectedPiece.barcode, ITEM_STATUS_NAMES.ON_ORDER);

      // Step 2: Click on PO line number link in the "Acquisition" accordion
      InventoryInstance.clickAcquisitionOrderLineLink(testData.packageOrderLine.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitleExists(testData.instanceTitle);

      // Step 3: Click on the title row (but NOT on hyperlink in Title column)
      OrderLines.clickPackageTitleRow(testData.instanceTitle);
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.checkItemDetailsFields({ title: testData.instanceTitle });
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed();

      // Step 4: Click "Remove from package" button
      ReceivingEditForm.clickRemoveFromPackageButton();
      RemoveFromPackageModal.verifyModalView();

      // Step 5: Click "Cancel" button
      RemoveFromPackageModal.clickCancelButton();
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed();

      // Step 6: Click "Remove from package" button and click "Confirm" button
      ReceivingEditForm.clickRemoveFromPackageButton();
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });
      InteractorsTools.checkCalloutErrorMessage(
        RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.RECEIVED_PIECES_ERROR,
      );
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed();

      // Step 7: Click "Cancel" button on the "Title name" page
      ReceivingEditForm.clickCancelButton();
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitleExists(testData.instanceTitle);

      // Step 8: Click "Actions" button on PO Line details pane, select "Receive" and click on Title
      OrderLines.openReceiving();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.assertBoundItemsListCount(1);

      // Step 9: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(3);
      ReceivingDetails.assertBoundItemsListCount(1);

      // Step 10: Select "Unreceive" option in "Received" accordion, check all pieces and unreceive
      Receivings.unreceiveFromReceivedSection();
      Receivings.unreceiveAll();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(4);
      ReceivingDetails.assertBoundItemsListCount(1);

      // Step 11: Select "Remove from package" option and click "Confirm" button
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.clickConfirmButton();
      Receivings.verifyChooseFilterMessage();

      // Step 12: Navigate to the "Inventory" app and search for the Instance
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.instanceTitle);
      InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ barcode: testData.boundItemBarcode, status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.verifyOrdersCount(0);

      // Step 13: Navigate to the Order, click "Actions" button and select "Receive" option
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openReceivingsPage();
      Receivings.assertReceivingResults([testData.nonPackageTitle]);

      // Step 14: Click "Actions" button on the "Title name" pane
      Receivings.selectFromResultsList(testData.nonPackageTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.nonPackageTitle);
      ReceivingDetails.verifyRemoveFromPackageOptionDisplayed(false);

      // Step 15: Select "Edit" option in the "Actions" menu
      ReceivingDetails.editReceivingItem();
      ReceivingEditForm.verifyRemoveFromPackageButtonDisplayed(false);
    },
  );
});
