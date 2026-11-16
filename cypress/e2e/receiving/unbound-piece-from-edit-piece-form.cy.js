import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  BOUND_PIECES_DATA_LIST_COLUMNS,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances, ItemRecordView } from '../../support/fragments/inventory';
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

const BOUND_PIECES_DATA_COLUMNS = Object.values(BOUND_PIECES_DATA_LIST_COLUMNS);
const ITEM_DETAILS_ORIGINAL_ACCORDION = 'Item details (original)';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C502960_FolioInstance_${postfix}`,
      // Piece #1 has no related item, Piece #2 has related item with barcode
      piece1: { id: uuid(), displaySummary: `AT_C502960_Piece_1_${postfix}` },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C502960_Piece_2_${postfix}`,
        barcode: `AT_C502960_Piece_2_Barcode_${postfix}`,
      },
      boundItemBarcode: `AT_C502960_BoundItem_Barcode_${postfix}`,
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
          locations: [{ locationId: testData.location.id, quantity: 2, quantityPhysical: 2 }],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 2,
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

    // Both pieces in "Loc 1", only Piece #2 has related item; both are received and bound
    cy.then(() => {
      const { orderLine, piece1, piece2 } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: orderLine.id,
          titleId: title.id,
          holdingId: orderLine.locations[0].holdingId,
        };

        Pieces.upsertOrderPiecesBatchViaApi([{ ...pieceDefaults, ...piece1 }]);
        Pieces.upsertOrderPiecesBatchViaApi([{ ...pieceDefaults, ...piece2 }], {
          createItem: true,
        });
      });
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: orderLine.id,
          pieces: [{ id: piece1.id }, { id: piece2.id }],
        });
      });
      cy.then(() => {
        Pieces.bindPiecesViaApi({
          bindItem: {
            barcode: testData.boundItemBarcode,
            holdingId: orderLine.locations[0].holdingId,
            materialTypeId: testData.materialType.id,
            permanentLoanTypeId: testData.loanType.id,
          },
          bindPieceIds: [piece1.id, piece2.id],
          instanceId: orderLine.instanceId,
          poLineId: orderLine.id,
        });
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
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.instanceTitle });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C502960 Unbound piece from "Edit piece" form in "Receiving" app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C502960'] },
    () => {
      const { piece1, piece2 } = testData;
      const checkBoundItemDetails = () => {
        ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      };
      // "Receiving" app restores the last search results, so the title is opened from them
      const goBackToTitleWithBoundPieces = () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
        ReceivingDetails.filterReceivedPiecesByOptions([
          RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
        ]);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.assertBoundItemsListColumns();

      // Step 2: Click "Actions" button in "Received" accordion and select "Bound" option
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

      // Step 3: Click on the barcode hyperlink in "Bound items" accordion
      ReceivingDetails.clickBoundItemBarcodeLink(testData.boundItemBarcode);
      checkBoundItemDetails();

      // Step 4: Check "Bound pieces data" accordion
      ItemRecordView.checkBoundPiecesDataTable({
        columns: BOUND_PIECES_DATA_COLUMNS,
        rows: [piece1.displaySummary, piece2.barcode],
      });
      // Piece #1 has no related item, so its "Barcode" cell is blank
      ItemRecordView.verifyBoundPiecesDataCell({
        rowContent: piece1.displaySummary,
        column: BOUND_PIECES_DATA_LIST_COLUMNS.BARCODE,
        content: NO_VALUE,
      });

      // Step 5: Go back to "Receiving" app and click on "Piece #1" record in "Received" accordion
      goBackToTitleWithBoundPieces();
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(NO_VALUE);

      // Step 6: Uncheck "Bound" checkbox and click "Save & close" button
      EditPieceModal.setBoundCheckbox(false);
      EditPieceModal.clickSaveAndCloseButton();

      // Step 7: Click on the barcode hyperlink in "Bound items" accordion
      ReceivingDetails.clickBoundItemBarcodeLink(testData.boundItemBarcode);
      checkBoundItemDetails();

      // Step 8: Check "Bound pieces data" accordion
      ItemRecordView.checkBoundPiecesDataTable({
        columns: BOUND_PIECES_DATA_COLUMNS,
        rows: [piece2.barcode],
      });
      ItemRecordView.verifyBarcodeLinkInBoundPiecesData(piece2.barcode);

      // Step 9: Go back to "Receiving" app, click on "Piece #2" record and check "Piece details"
      goBackToTitleWithBoundPieces();
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece2.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
      EditPieceModal.checkAccordionsConditions([
        { label: ITEM_DETAILS_ORIGINAL_ACCORDION, conditions: { open: true } },
      ]);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE, conditions: { value: piece2.barcode } },
      ]);

      // Step 10: Click on the "Connected" hyperlink
      Receivings.selectConnectedInEditPiece();
      ItemRecordView.waitLoading();
      checkBoundItemDetails();

      // Step 11: Click link related to Piece #2 in "Bound pieces data" accordion
      ItemRecordView.clickBarcodeLinkInBoundPiecesDataAccordion(piece2.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(piece2.barcode);
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.UNAVAILABLE);
    },
  );
});
