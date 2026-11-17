import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  BOUND_PIECES_DATA_LIST_COLUMNS,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstances,
  InventoryItems,
  ItemRecordView,
} from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  BindPiecesForm,
  PieceForm,
  ReceivingDetails,
  Receivings,
} from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const NO_BARCODE = 'No barcode';
const BIND_UNBIND_CYCLES = 4; // Steps 1-10 plus three repeats from Step 11
const BOUND_PIECES_DATA_COLUMNS = Object.values(BOUND_PIECES_DATA_LIST_COLUMNS);

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C506655_FolioInstance_${postfix}`,
      piece1: {
        id: uuid(),
        displaySummary: `AT_C506655_Piece_1_${postfix}`,
        barcode: `AT_C506655_Piece_1_Barcode_${postfix}`,
      },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C506655_Piece_2_${postfix}`,
        barcode: `AT_C506655_Piece_2_Barcode_${postfix}`,
      },
      boundItemCallNumber: `AT_C506655_BoundItem_CallNumber_${postfix}`,
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

    // Both pieces have related items in the same location ("Loc 1") and are received
    cy.then(() => {
      const { orderLine, piece1, piece2 } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: orderLine.id,
          titleId: title.id,
          holdingId: orderLine.locations[0].holdingId,
        };

        Pieces.upsertOrderPiecesBatchViaApi(
          [
            { ...pieceDefaults, ...piece1 },
            { ...pieceDefaults, ...piece2 },
          ],
          { createItem: true },
        );
      });
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: orderLine.id,
          pieces: [{ id: piece1.id }, { id: piece2.id }],
        });
      });
      // Original items of the pieces, to be compared with the "Connected" items after unbinding
      [piece1, piece2].forEach((piece) => {
        Pieces.getOrderPiecesViaApi({ query: `id==${piece.id}` })
          .then(({ pieces: [createdPiece] }) => {
            return InventoryItems.getItemByIdViaApi(createdPiece.itemId);
          })
          .then((item) => {
            piece.itemHrid = item.hrid;
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
          CapabilitySets.uiReceivingEdit,
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
    'C506655 Verify that the “original” item record is the FIRST item record created after bound and unbound several times (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C506655'] },
    () => {
      const { piece1, piece2 } = testData;

      // Step 11: Repeat steps 1-10 three times
      for (let cycle = 1; cycle <= BIND_UNBIND_CYCLES; cycle++) {
        // Step 1: Click on Title record, click "Actions" in "Received" accordion and select "Bind piece"
        // On repeats "Receiving" reopens the "Edit piece" form of Piece #2 from Step 10
        if (cycle === 1) {
          Receivings.selectFromResultsList(testData.instanceTitle);
        } else {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
          EditPieceModal.clickCancelButton();
        }
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
        ReceivingDetails.verifyReceivedRecordsCount(2);
        ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
        BindPiecesForm.waitLoading();
        BindPiecesForm.checkFormTitle(testData.instanceTitle);

        // Step 2: Select Piece #1 and Piece #2 and fill the bind item fields (barcode is empty)
        BindPiecesForm.selectPiecesByDisplaySummary([piece1.displaySummary, piece2.displaySummary]);
        BindPiecesForm.fillBindItemDetails({
          materialType: testData.materialType.name,
          callNumber: testData.boundItemCallNumber,
          permanentLoanType: testData.loanType.name,
          permanentLocation: testData.location.name,
        });
        BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

        // Step 3: Click "Bind" button
        BindPiecesForm.clickBindButton();
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
        ReceivingDetails.verifyReceivedRecordsCount(0);
        ReceivingDetails.assertBoundItemsListCount(1);
        ReceivingDetails.checkBoundItemsTableContent([
          {
            barcode: NO_BARCODE,
            status: ITEM_STATUS_NAMES.IN_PROCESS,
            callNumber: testData.boundItemCallNumber,
          },
        ]);

        // Step 4: Click "Actions" button in "Received" accordion and select "Bound" option
        ReceivingDetails.filterReceivedPiecesByOptions([
          RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
        ]);
        ReceivingDetails.verifyReceivedRecordsCount(2);
        ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

        // Step 5: Click on the barcode hyperlink in "Bound items" accordion
        ReceivingDetails.clickBoundItemBarcodeLink(NO_BARCODE);
        ItemRecordView.verifyItemBarcode();
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);

        // Step 6: Check "Bound pieces data" accordion
        ItemRecordView.checkBoundPiecesDataTable({
          columns: BOUND_PIECES_DATA_COLUMNS,
          rows: [piece1.barcode, piece2.barcode],
        });

        // Step 7: Remove Piece #1 and Piece #2 from the bound item
        ItemRecordView.removePieceFromBoundItem(piece1.barcode);
        ItemRecordView.checkBoundPiecesDataTable({ rows: [piece2.barcode] });
        ItemRecordView.removePieceFromBoundItem(piece2.barcode);
        ItemRecordView.checkBoundPiecesDataTable({ rows: [] });

        // Step 8: Go back to "Receiving" app and refresh the page
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        cy.reload();
        Receivings.waitLoading();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
        ReceivingDetails.verifyReceivedRecordsCount(2);
        ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary, piece2.displaySummary]);

        // Step 9: Click on "Piece #1" record and click "Connected" link under "Create item"
        ReceivingDetails.openEditPieceModal({
          section: 'received',
          displaySummary: piece1.displaySummary,
        });
        EditPieceModal.waitLoading();
        PieceForm.clickConnectedItemLink();
        ItemRecordView.waitLoading();
        ItemRecordView.verifyHrid(piece1.itemHrid);
        ItemRecordView.verifyItemBarcode(piece1.barcode);

        // Step 10: Go back to "Receiving" app, click on "Piece #2" record and click "Connected" link
        // "Receiving" reopens the "Edit piece" form of Piece #1 from Step 9
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        EditPieceModal.clickCancelButton();
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
        ReceivingDetails.openEditPieceModal({
          section: 'received',
          displaySummary: piece2.displaySummary,
        });
        EditPieceModal.waitLoading();
        PieceForm.clickConnectedItemLink();
        ItemRecordView.waitLoading();
        ItemRecordView.verifyHrid(piece2.itemHrid);
        ItemRecordView.verifyItemBarcode(piece2.barcode);
      }
    },
  );
});
