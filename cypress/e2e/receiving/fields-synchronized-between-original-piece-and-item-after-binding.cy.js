import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  BOUND_PIECES_DATA_LIST_COLUMNS,
  INVENTORY_ITEMS,
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
  ItemRecordEdit,
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
      instanceTitle: `AT_C959224_FolioInstance_${postfix}`,
      piece1: {
        id: uuid(),
        displaySummary: `AT_C959224_Piece_1_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959224_Piece_1_CopyNumber_${postfix}`,
        enumeration: `AT_C959224_Piece_1_Enumeration_${postfix}`,
        chronology: `AT_C959224_Piece_1_Chronology_${postfix}`,
        barcode: `AT_C959224_Piece_1_Barcode_${postfix}`,
        callNumber: `AT_C959224_Piece_1_CallNumber_${postfix}`,
        accessionNumber: `AT_C959224_Piece_1_AccessionNumber_${postfix}`,
      },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C959224_Piece_2_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959224_Piece_2_CopyNumber_${postfix}`,
        enumeration: `AT_C959224_Piece_2_Enumeration_${postfix}`,
        chronology: `AT_C959224_Piece_2_Chronology_${postfix}`,
        barcode: `AT_C959224_Piece_2_Barcode_${postfix}`,
        callNumber: `AT_C959224_Piece_2_CallNumber_${postfix}`,
        accessionNumber: `AT_C959224_Piece_2_AccessionNumber_${postfix}`,
      },
      boundItem: {
        barcode: `AT_C959224_BoundItem_Barcode_${postfix}`,
        callNumber: `AT_C959224_BoundItem_CallNumber_${postfix}`,
      },
      editedBoundItem: {
        displaySummary: `AT_C959224_BoundItem_Edited_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959224_BoundItem_Edited_CopyNumber_${postfix}`,
        enumeration: `AT_C959224_BoundItem_Edited_Enumeration_${postfix}`,
        chronology: `AT_C959224_BoundItem_Edited_Chronology_${postfix}`,
        barcode: `AT_C959224_BoundItem_Edited_Barcode_${postfix}`,
        callNumber: `AT_C959224_BoundItem_Edited_CallNumber_${postfix}`,
        accessionNumber: `AT_C959224_BoundItem_Edited_AccessionNumber_${postfix}`,
      },
      editedOriginalItem: {
        displaySummary: `AT_C959224_OriginalItem_Edited_DisplaySummary_${postfix}`,
        copyNumber: `AT_C959224_OriginalItem_Edited_CopyNumber_${postfix}`,
        enumeration: `AT_C959224_OriginalItem_Edited_Enumeration_${postfix}`,
        chronology: `AT_C959224_OriginalItem_Edited_Chronology_${postfix}`,
        barcode: `AT_C959224_OriginalItem_Edited_Barcode_${postfix}`,
        callNumber: `AT_C959224_OriginalItem_Edited_CallNumber_${postfix}`,
        accessionNumber: `AT_C959224_OriginalItem_Edited_AccessionNumber_${postfix}`,
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

    // Both pieces have related items in the POL holding, are received and bound into this holding
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
      cy.then(() => {
        Pieces.bindPiecesViaApi({
          bindItem: {
            barcode: testData.boundItem.barcode,
            callNumber: testData.boundItem.callNumber,
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
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiInventory,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
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
    'C959224 Fields for call number, barcode, and accession number are synchronized between original piece and item after binding (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C959224'] },
    () => {
      const { piece1, piece2, boundItem, editedBoundItem, editedOriginalItem } = testData;
      const { BARCODE, CHRONOLOGY, COPY_NUMBER, ENUMERATION } = BOUND_PIECES_DATA_LIST_COLUMNS;

      // Step 1: Search for the Title related to POL and click on its record
      Receivings.searchByParameter({ value: testData.instanceTitle });
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        { barcode: boundItem.barcode, callNumber: boundItem.callNumber },
      ]);

      // Step 2: Click on the bound item barcode
      ReceivingDetails.clickBoundItemBarcodeLink(boundItem.barcode);
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: boundItem.barcode } },
        ],
        itemData: [
          { label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: boundItem.callNumber } },
        ],
      });
      ItemRecordView.checkBoundPiecesDataTable({
        columns: BOUND_PIECES_DATA_COLUMNS,
        rows: [piece1.displaySummary, piece2.displaySummary],
      });
      [piece1, piece2].forEach((piece) => {
        [
          [BARCODE, piece.barcode],
          [CHRONOLOGY, piece.chronology],
          [COPY_NUMBER, piece.copyNumber],
          [ENUMERATION, piece.enumeration],
        ].forEach(([column, content]) => {
          ItemRecordView.verifyBoundPiecesDataCell({
            rowContent: piece.displaySummary,
            column,
            content,
          });
        });
      });

      // Step 3: Edit the bound item fields and click "Save & close" button
      ItemRecordView.openItemEditForm(testData.instanceTitle);
      ItemRecordEdit.fillItemRecordFields(editedBoundItem);
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: editedBoundItem.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: editedBoundItem.accessionNumber },
          },
        ],
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: editedBoundItem.copyNumber } },
          { label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: editedBoundItem.callNumber } },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: editedBoundItem.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: editedBoundItem.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: editedBoundItem.chronology },
          },
        ],
      });
      ItemRecordView.checkBoundPiecesDataTable({
        rows: [piece1.displaySummary, piece2.displaySummary],
      });
      [piece1, piece2].forEach((piece) => {
        [
          [BARCODE, piece.barcode],
          [CHRONOLOGY, piece.chronology],
          [COPY_NUMBER, piece.copyNumber],
          [ENUMERATION, piece.enumeration],
        ].forEach(([column, content]) => {
          ItemRecordView.verifyBoundPiecesDataCell({
            rowContent: piece.displaySummary,
            column,
            content,
          });
        });
      });

      // Step 4: Navigate back to the "Title name" pane in the "Receiving" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        {
          barcode: editedBoundItem.barcode,
          displaySummary: editedBoundItem.displaySummary,
          callNumber: editedBoundItem.callNumber,
        },
      ]);

      // Step 5: Click "Actions" button in the "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([
        piece1.displaySummary,
        piece1.barcode,
        piece1.copyNumber,
        piece1.enumeration,
        piece1.chronology,
        piece2.displaySummary,
        piece2.barcode,
        piece2.copyNumber,
        piece2.enumeration,
        piece2.chronology,
      ]);

      // Step 6: Click on the Title name link, expand "Holdings" and click on Piece #1 item barcode
      ReceivingDetails.openInstanceDetailsByTitle(testData.instanceTitle);
      InventoryInstance.openHoldings(testData.location.name);
      InventoryInstance.openItemByBarcode(piece1.barcode);
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: piece1.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: piece1.accessionNumber },
          },
        ],
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: piece1.copyNumber } },
          { label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: piece1.callNumber } },
        ],
        enumerationData: [
          { label: INVENTORY_ITEMS.DISPLAY_SUMMARY, conditions: { value: piece1.displaySummary } },
          { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: piece1.enumeration } },
          { label: INVENTORY_ITEMS.CHRONOLOGY, conditions: { value: piece1.chronology } },
        ],
      });

      // Step 7: Edit the Piece #1 item fields and click "Save & close" button
      ItemRecordView.openItemEditForm(testData.instanceTitle);
      ItemRecordEdit.fillItemRecordFields(editedOriginalItem);
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: editedOriginalItem.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: editedOriginalItem.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: editedOriginalItem.copyNumber },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: editedOriginalItem.callNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: editedOriginalItem.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: editedOriginalItem.enumeration },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: editedOriginalItem.chronology },
          },
        ],
      });

      // Step 8: Close Item details pane and click on the bound item barcode
      ItemRecordView.closeDetailView();
      InventoryInstance.openHoldings(testData.location.name);
      InventoryInstance.openItemByBarcode(editedBoundItem.barcode);
      ItemRecordView.checkBoundPiecesDataTable({
        rows: [piece1.displaySummary, piece2.displaySummary],
      });
      // Piece #1 barcode is synchronized with its edited item, other piece fields keep their values
      [{ ...piece1, barcode: editedOriginalItem.barcode }, piece2].forEach((piece) => {
        [
          [BARCODE, piece.barcode],
          [CHRONOLOGY, piece.chronology],
          [COPY_NUMBER, piece.copyNumber],
          [ENUMERATION, piece.enumeration],
        ].forEach(([column, content]) => {
          ItemRecordView.verifyBoundPiecesDataCell({
            rowContent: piece.displaySummary,
            column,
            content,
          });
        });
      });

      // Step 9: Navigate back to the "Title name" pane in the "Receiving" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        {
          barcode: editedBoundItem.barcode,
          displaySummary: editedBoundItem.displaySummary,
          callNumber: editedBoundItem.callNumber,
        },
      ]);

      // Step 10: Check "Bound" checkbox in the "Received" accordion and click on the Piece #1
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      // "Piece details" accordion keeps the piece values
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY,
          conditions: { value: piece1.displaySummary },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.COPY_NUMBER,
          conditions: { value: piece1.copyNumber },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION,
          conditions: { value: piece1.enumeration },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY,
          conditions: { value: piece1.chronology },
        },
      ]);
      // "Item details (original)" accordion is updated with the related item values
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE,
          conditions: { value: editedOriginalItem.barcode },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER,
          conditions: { value: editedOriginalItem.callNumber },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER,
          conditions: { value: editedOriginalItem.accessionNumber },
        },
      ]);
    },
  );
});
