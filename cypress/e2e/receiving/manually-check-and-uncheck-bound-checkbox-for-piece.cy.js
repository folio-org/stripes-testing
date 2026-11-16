import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances, ItemRecordView } from '../../support/fragments/inventory';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C506703_FolioInstance_${postfix}`,
      piece: {
        id: uuid(),
        displaySummary: `AT_C506703_Piece_${postfix}`,
        barcode: `AT_C506703_OriginalItem_Barcode_${postfix}`,
      },
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
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
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
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    // Received piece with related item with barcode
    cy.then(() => {
      const { orderLine, piece } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        Pieces.upsertOrderPiecesBatchViaApi(
          [
            {
              ...NewPiece.defaultPiece,
              ...piece,
              poLineId: orderLine.id,
              titleId: title.id,
              holdingId: orderLine.locations[0].holdingId,
            },
          ],
          { createItem: true },
        );
      });
      cy.then(() => {
        // Check-in sets "In process" status for related item
        Receivings.receivePieceViaApi({ poLineId: orderLine.id, pieces: [{ id: piece.id }] });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C506703 Manually checking and unchecking "Bind" checkbox for receiving piece (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C506703'] },
    () => {
      const { piece } = testData;

      // Step 1: Go to "Inventory" app and search for the item with barcode related to the piece
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', piece.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(piece.barcode);
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 2: Go to "Receiving" pane with search results for Title related to POL
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.instanceTitle });
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([piece.barcode]);

      // Step 3: Click on the piece in "Received" accordion
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false);

      // Step 4: Check the "Bound" checkbox and click "Save & close" button
      EditPieceModal.setBoundCheckbox(true);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 5: Go to "Inventory" app and search for the item with barcode related to the piece
      // "Inventory" app restores the last opened item record, which hides the search pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      ItemRecordView.closeDetailView();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', piece.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 6: Go to "Receiving" pane, click "Actions" button in "Received" accordion and check "Bound"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.instanceTitle });
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.checkReceivedPiecesPresent([piece.barcode]);

      // Step 7: Click on the piece in "Received" accordion
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);

      // Step 8: Uncheck the "Bound" checkbox and click "Save & close" button
      EditPieceModal.setBoundCheckbox(false);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 9: Go to "Inventory" app and search for the item with barcode related to the piece
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      ItemRecordView.closeDetailView();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', piece.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
    },
  );
});
