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
import {
  InventoryInstance,
  InventoryInstances,
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
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BOUND_PIECES_DATA_COLUMNS = Object.values(BOUND_PIECES_DATA_LIST_COLUMNS);

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C494018_FolioInstance_${postfix}`,
      // Piece #1 has no related item, Piece #2 has related item
      piece1: { id: uuid(), displaySummary: `AT_C494018_Piece_1_${postfix}` },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C494018_Piece_2_${postfix}`,
        barcode: `AT_C494018_Piece_2_Barcode_${postfix}`,
      },
      boundItemBarcode: `AT_C494018_BoundItem_Barcode_${postfix}`,
      boundItemCallNumber: `AT_C494018_BoundItem_CallNumber_${postfix}`,
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
          locations: [{ locationId: testData.location1.id, quantity: 2, quantityPhysical: 2 }],
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
      // Bound item is created in a new holding of "Loc 2", different from pieces location
      cy.then(() => {
        Pieces.bindPiecesViaApi({
          bindItem: {
            barcode: testData.boundItemBarcode,
            callNumber: testData.boundItemCallNumber,
            locationId: testData.location2.id,
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
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingView,
          CapabilitySets.uiInventoryInstanceView,
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
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C494018 Remove bound piece from bound item page (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C494018'] },
    () => {
      const { piece1, piece2 } = testData;
      const checkBoundItemDetails = () => {
        ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.assertBoundItemsListColumns();

      // Step 2: Click "Actions" button in "Received" accordion and check "Bound" checkbox
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
      // Barcode is a link to the item record related to Piece #2
      ItemRecordView.verifyBarcodeLinkInBoundPiecesData(piece2.barcode);

      // Step 5-6: Click "X" button for Piece #2 and click "Remove" button
      ItemRecordView.removePieceFromBoundItem(piece2.barcode);
      ItemRecordView.checkBoundPiecesDataTable({ rows: [piece1.displaySummary] });

      // Step 7: Go back to "Receiving" app and refresh the page
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      cy.reload();
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([piece2.barcode]);

      // Step 8: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.displaySummary]);

      // Step 9: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(NO_VALUE);

      // Step 10: Close "Edit piece" form and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece2.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false);

      // Step 11: Close "Edit piece" form and click on "Title name" link
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name });

      // Step 12: Expand "Loc 1" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [{ barcode: piece2.barcode, status: ITEM_STATUS_NAMES.UNAVAILABLE }],
      });

      // Step 13: Expand "Loc 2" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location2.name,
        records: [{ barcode: testData.boundItemBarcode, status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });

      // Step 14: Click the link in "Item: barcode" column
      InventoryInstance.openItemByBarcode(testData.boundItemBarcode);
      ItemRecordView.waitLoading();
      checkBoundItemDetails();
      ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
      ItemRecordView.verifyMaterialType(testData.materialType.name);
      ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
      ItemRecordView.verifyEffectiveLocation(testData.location2.name);

      // Step 15: Check "Bound pieces data" accordion
      ItemRecordView.checkBoundPiecesDataTable({
        columns: BOUND_PIECES_DATA_COLUMNS,
        rows: [piece1.displaySummary],
      });
    },
  );
});
