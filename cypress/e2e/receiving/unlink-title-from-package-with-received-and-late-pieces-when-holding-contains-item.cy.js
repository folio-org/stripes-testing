import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES,
  RECEIVING_TITLE_SEARCH_INDEX_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import DeleteHoldingsModal from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
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
      displaySummary: `AT_C736757_Piece${index}_${postfix}`,
      barcode: `AT_C736757_Piece${index}_Barcode_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C736757_FolioInstance_${postfix}`,
      itemBarcode: `AT_C736757_Item_Barcode_${postfix}`,
      packageName: `AT_C736757_Package_${postfix}`,
      editedPackageName: `AT_C736757_EditedPackage_${postfix}`,
      receivedPiece: getPiece(1),
      latePiece: getPiece(2),
      expectedPiece: getPiece(3),
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

    // Instance with "Loc 1" holding containing one item
    cy.then(() => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: { instanceTypeId: testData.instanceType.id, title: testData.instanceTitle },
        holdings: [
          { holdingsTypeId: testData.holdingType.id, permanentLocationId: testData.location1.id },
        ],
        items: [
          {
            barcode: testData.itemBarcode,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanType.id },
            materialType: { id: testData.materialType.id },
          },
        ],
      }).then((instance) => {
        testData.instance = instance;
      });
    });

    // "Ongoing" order with package PO line, the instance is added to "Package titles"
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
          testData.orderLine = orderLine;

          OrderLines.addPackageTitleViaApi({
            title: testData.instanceTitle,
            poLineId: orderLine.id,
            instanceId: testData.instance.instanceId,
          }).then(({ body: title }) => {
            testData.titleId = title.id;
          });
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.then(() => {
      const { receivedPiece, latePiece, expectedPiece } = testData;
      const existingHoldingId = testData.instance.holdingIds[0].id;

      // Piece #1 and Piece #2 with items in existing "Loc 1" holding, Piece #3 in new "Loc 2" holding
      // (created one by one as in "Receiving" app; pieces-batch would add piece holdings to POL locations)
      [
        { piece: receivedPiece, holdingId: existingHoldingId },
        { piece: latePiece, holdingId: existingHoldingId },
        { piece: expectedPiece, locationId: testData.location2.id },
      ].forEach(({ piece, holdingId, locationId }) => {
        Receivings.addPieceViaApi(
          {
            poLineId: testData.orderLine.id,
            poLineNumber: testData.orderLine.poLineNumber,
            format: testData.orderLine.orderFormat,
            holdingId,
            searchParams: { createItem: true },
          },
          { ...piece, titleId: testData.titleId, locationId },
        );
      });
      // Piece #1 is received, Piece #2 is marked as "Late", Piece #3 remains "Expected"
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: testData.orderLine.id,
          pieces: [{ id: receivedPiece.id }],
        });
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: [latePiece.id],
          receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersEdit,
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
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C736757 Unlink title from Package with received and late pieces when related holding contains an item (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C736757'] },
    () => {
      const { receivedPiece, latePiece, expectedPiece } = testData;

      // Step 1: Click on the Instance from Preconditions #1
      InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 3 });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({ name: testData.location1.name });
      InventoryInstance.checkItemStatusByBarcode(latePiece.barcode, ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstance.checkItemStatusByBarcode(testData.itemBarcode, ITEM_STATUS_NAMES.AVAILABLE);
      InventoryInstance.checkItemStatusByBarcode(
        receivedPiece.barcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      InventoryInstance.checkHoldingsTableContent({ name: testData.location2.name });
      InventoryInstance.checkItemStatusByBarcode(expectedPiece.barcode, ITEM_STATUS_NAMES.ON_ORDER);

      // Step 2: Click on PO line number link in the "Acquisition" accordion
      InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitleExists(testData.instanceTitle);

      // Step 3: Click "Actions" button on PO Line details pane and select "Edit" option
      OrderLineDetails.openOrderLineEditForm();

      // Step 4: Edit package name and click "Save & close" button
      OrderLineEditForm.fillItemDetails({ title: testData.editedPackageName });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [{ key: 'Package name', value: testData.editedPackageName }],
      });

      // Step 5: Navigate to "Receiving" app, reset filters and search by edited package name
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.resetFilters();
      Receivings.searchByParameter({
        parameter: RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE,
        value: testData.editedPackageName,
      });
      Receivings.assertReceivingResultsCells([
        [
          { column: 'Title', content: testData.instanceTitle },
          { column: 'Package', content: testData.editedPackageName },
        ],
      ]);

      // Step 6: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        latePiece.displaySummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        expectedPiece.displaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 7: Click "Actions" button on the "Title name" pane and select "Remove from package"
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.verifyModalView();

      // Step 8: Click "Confirm" button in "Remove from package" pop up
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });
      InteractorsTools.checkCalloutErrorMessage(
        RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.RECEIVED_PIECES_ERROR,
      );
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 9: Click on the record in "Received" accordion and select "Unreceive" option
      ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.verifyExpectedRecordsCount(3);
      ReceivingDetails.checkExpectedPieceStatus(
        latePiece.displaySummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        receivedPiece.displaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        expectedPiece.displaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 10: Select "Remove from package" option, click "Confirm" and "Keep Holdings" buttons
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });
      DeleteHoldingsModal.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
        message: RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.SUCCESS);
      Receivings.assertReceivingResults([]);

      // Step 11: Navigate to the "Inventory" app and search for the Instance
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.instanceTitle);
      InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [{ barcode: testData.itemBarcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
      });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 0 });
      InventoryInstance.verifyOrdersCount(0);
    },
  );
});
