import { v4 as uuid } from 'uuid';

import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstance,
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
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Requests from '../../support/fragments/requests/requests';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const PIECES_TOTAL = 3;
const REQUESTS_TOTAL = 3;
const BIND_PIECES_TABLE_COLUMNS = [
  RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY,
  RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION,
  RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY,
  RECEIVING_PIECE_FORM_FIELD_LABELS.COPY_NUMBER,
  RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER,
  RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS.STATUS,
  RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER,
];

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    const getPiece = (number) => ({
      id: uuid(),
      displaySummary: `AT_C477535_Piece_${number}_${postfix}`,
      barcode: `AT_C477535_Piece_${number}_Barcode_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C477535_FolioInstance_${postfix}`,
      piece1: getPiece(1),
      piece2: getPiece(2),
      piece3: getPiece(3),
      boundItemBarcode: `AT_C477535_BoundItem_Barcode_${postfix}`,
      boundItemCallNumber: `AT_C477535_BoundItem_CallNumber_${postfix}`,
      requesters: [],
      requestIds: [],
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
    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation==true' }).then(([servicePoint]) => {
      testData.pickupServicePoint = servicePoint;
    });
    // Three different requesters: two for Piece #1 item and one for Piece #2 item
    Array.from({ length: REQUESTS_TOTAL }).forEach(() => {
      cy.createTempUser([]).then((requester) => {
        testData.requesters.push(requester);
      });
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
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
          locations: [
            {
              locationId: testData.location.id,
              quantity: PIECES_TOTAL,
              quantityPhysical: PIECES_TOTAL,
            },
          ],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: PIECES_TOTAL,
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

    // Three received pieces with related items in "Loc 1"
    cy.then(() => {
      const { orderLine, piece1, piece2, piece3, requesters } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        Pieces.upsertOrderPiecesBatchViaApi(
          [piece1, piece2, piece3].map((piece) => ({
            ...NewPiece.defaultPiece,
            ...piece,
            poLineId: orderLine.id,
            titleId: title.id,
            holdingId: orderLine.locations[0].holdingId,
          })),
          { createItem: true },
        ).then(({ pieces }) => {
          const getItemId = (pieceId) => pieces.find(({ id }) => id === pieceId).itemId;
          // Requests are created one minute apart to have a defined chronological order
          const requestsData = [
            { itemId: getItemId(piece1.id), requesterId: requesters[0].userId },
            { itemId: getItemId(piece1.id), requesterId: requesters[1].userId },
            { itemId: getItemId(piece2.id), requesterId: requesters[2].userId },
          ];

          requestsData.forEach(({ itemId, requesterId }, index) => {
            Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: orderLine.locations[0].holdingId,
              instanceId: orderLine.instanceId,
              itemId,
              pickupServicePointId: testData.pickupServicePoint.id,
              requestDate: new Date(
                Date.now() - (REQUESTS_TOTAL - index) * 60 * 1000,
              ).toISOString(),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.HOLD,
              requesterId,
            }).then(({ body }) => {
              testData.requestIds.push(body.id);
            });
          });
          // Check-in sets "In process" status for related items
          Receivings.receivePieceViaApi({
            poLineId: orderLine.id,
            pieces: [{ id: piece1.id }, { id: piece2.id }, { id: piece3.id }],
          });
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
          CapabilitySets.uiReceivingCreate,
          CapabilitySets.uiRequestsView,
        ],
      );
      // "Requests" app is accessible only for a user with assigned service point
      UserEdit.addServicePointViaApi(
        testData.pickupServicePoint.id,
        testData.user.userId,
        testData.pickupServicePoint.id,
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
    testData.requestIds.forEach((requestId) => {
      Requests.deleteRequestViaApi(requestId);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    testData.requesters.forEach((requester) => {
      Users.deleteViaApi(requester.userId);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C477535 Bind pieces from one-time order (not package), when related item has more than one outstanding request (transfer) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C477535'] },
    () => {
      const { piece1, piece2, piece3 } = testData;
      const checkBoundItemDetails = () => {
        ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
        ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
        ItemRecordView.verifyMaterialType(testData.materialType.name);
        ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
        ItemRecordView.verifyEffectiveLocation(testData.location.name);
        ItemRecordView.verifyRequestsCount(REQUESTS_TOTAL);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      // Step 2: Click "Actions" button in "Received" accordion and select "Bind pieces" option
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.checkFormTitle(
        `${testData.orderLine.poLineNumber} - ${testData.instanceTitle}`,
      );
      BindPiecesForm.checkBindItemFieldsEmpty();
      BindPiecesForm.checkPiecesTableColumns(BIND_PIECES_TABLE_COLUMNS);
      BindPiecesForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Bind', conditions: { disabled: true } },
      ]);
      BindPiecesForm.checkPiecesCount(PIECES_TOTAL);
      [piece1, piece2, piece3].forEach(({ displaySummary, barcode }) => {
        BindPiecesForm.checkPieceRowContent(displaySummary, [barcode]);
      });

      // Step 3: Select Piece #1 and Piece #2, fill fields and create new holdings for "Loc 1"
      BindPiecesForm.selectPiecesByDisplaySummary([piece1.displaySummary, piece2.displaySummary]);
      BindPiecesForm.fillBindItemDetails({ newHoldingLocation: testData.location.name });
      BindPiecesForm.fillBindItemDetails({
        barcode: testData.boundItemBarcode,
        materialType: testData.materialType.name,
        callNumber: testData.boundItemCallNumber,
        permanentLoanType: testData.loanType.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 4: Click "Bind" button
      BindPiecesForm.clickBindButton({ hasOpenRequests: true });
      BindPiecesForm.checkTransferRequestsModal([piece1.barcode, piece2.barcode]);

      // Step 5: Click "Transfer" button
      BindPiecesForm.clickTransferRequestsButton({ barcode: testData.boundItemBarcode });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([{ barcode: piece3.barcode }]);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        {
          barcode: testData.boundItemBarcode,
          status: ITEM_STATUS_NAMES.IN_PROCESS,
          callNumber: testData.boundItemCallNumber,
        },
      ]);
      // New "Loc 1" holding of the bound item, to tell it apart from the existing "Loc 1" holding
      Pieces.getOrderPiecesViaApi({ query: `id==${piece1.id}` })
        .then(({ pieces: [boundPiece] }) => InventoryItems.getItemByIdViaApi(boundPiece.bindItemId))
        .then((boundItem) => {
          testData.boundItemHoldingId = boundItem.holdingsRecordId;
        });

      // Step 6: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);
      ReceivingDetails.checkReceivedPiecesPresent([piece1.barcode, piece2.barcode, piece3.barcode]);

      // Step 7: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 8: Close "Edit piece" form, filter by "Bound" and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece2.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 9: Close "Edit piece" form and click on "Piece #3" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece3.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 10: Close "Edit piece" form and click on the record in "Bound items" accordion
      EditPieceModal.clickCancelButton();
      ReceivingDetails.clickBoundItemBarcodeLink(testData.boundItemBarcode);
      checkBoundItemDetails();

      // Step 11: Click "Instance name" link below item title
      ItemRecordView.clickInstanceTitleLink(testData.instanceTitle);
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: PIECES_TOTAL });
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      cy.then(() => {
        // Both holdings have the same "Loc 1" name, so they are expanded by holding id.
        // Items order in the holding is not stable, so items are checked by barcode
        InventoryInstance.checkHoldingsTableContent({
          holdingId: testData.orderLine.locations[0].holdingId,
        });
        [piece1, piece2].forEach(({ barcode }) => {
          InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
        });
        InventoryInstance.checkItemStatusByBarcode(piece3.barcode, ITEM_STATUS_NAMES.IN_PROCESS);
        InventoryInstance.checkHoldingsTableContent({
          holdingId: testData.boundItemHoldingId,
          records: [{ barcode: testData.boundItemBarcode, status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
      });

      // Step 12: Click "Barcode" link in "Item: barcode" column for newly created item
      InventoryInstance.openItemByBarcode(testData.boundItemBarcode);
      ItemRecordView.waitLoading();
      checkBoundItemDetails();

      // Step 13: Click "3" link in "Request" field
      ItemRecordView.openRequest();
      Requests.waitLoading();
      Requests.verifyResultsCount(REQUESTS_TOTAL);
      testData.requesters.forEach(({ barcode }) => {
        Requests.verifyRequestIsPresent(barcode);
      });
      Requests.validateRequestsDateSortingOrder('ascending');
    },
  );
});
