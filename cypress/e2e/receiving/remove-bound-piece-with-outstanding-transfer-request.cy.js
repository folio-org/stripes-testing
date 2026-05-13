import { v4 as uuid } from 'uuid';

import { Checkbox, KeyValue } from '../../../interactors';
import {
  BOUND_PIECES_DATA_LIST_COLUMNS,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_MODES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
  RECEIVING_TITLE_SEARCH_INDEXES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  KEY_VALUE_NO_VALUE_MESSAGE,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  InventoryHoldings,
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
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

const R = {
  ACQUISITION_METHOD: 'acquisitionMethod',
  ADMIN: 'admin',
  BOUND_ITEM: 'boundItem',
  LOAN_TYPE: 'loanType',
  LOCALE: 'locale',
  LOCATIONS: 'locations',
  MATERIAL_TYPE: 'materialType',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  ORGANIZATION: 'organization',
  PIECES: 'pieces',
  PICKUP_SERVICE_POINT: 'pickupServicePoint',
  REQUEST: 'request',
  REQUEST_ITEM: 'requestItem',
  RUN_USER: 'runUser',
  TITLE: 'title',
};

const PIECES_TOTAL = 2;

const getVisitOptions = (flow) => ({
  url: TopMenu.receivingPath,
  qs: {
    qindex: RECEIVING_TITLE_SEARCH_INDEXES.POL_NUMBER,
    query: flow.get(R.ORDER_LINE).poLineNumber,
  },
});

const createPiecesCleanup = (pieces) => () => {
  for (const piece of pieces) {
    InventoryItems.deleteItemViaApi(piece.itemId);
    Pieces.deleteOrderPieceViaApi(piece.id);
    InventoryHoldings.deleteHoldingRecordViaApi(piece.holdingId);
  }
};

const createRequestCleanup = (requestId) => () => Requests.deleteRequestViaApi(requestId);

const createItemLevelRequestBody = (flow) => ({
  fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
  holdingsRecordId: flow.get(R.ORDER_LINE).locations[0].holdingId,
  instanceId: flow.get(R.ORDER_LINE).instanceId,
  itemId: flow.get(R.REQUEST_ITEM).id,
  pickupServicePointId: flow.get(R.PICKUP_SERVICE_POINT).id,
  requestDate: new Date().toISOString(),
  requestLevel: REQUEST_LEVELS.ITEM,
  requestType: REQUEST_TYPES.HOLD,
  requesterId: flow.get(R.ADMIN).id,
});

const buildListConfig = (pieces) => {
  return [
    pieces.map((piece) => [
      { column: BOUND_PIECES_DATA_LIST_COLUMNS.BARCODE, value: piece.barcode },
      { column: BOUND_PIECES_DATA_LIST_COLUMNS.DISPLAY_SUMMARY, value: piece.displaySummary },
      { column: BOUND_PIECES_DATA_LIST_COLUMNS.CHRONOLOGY, value: piece.chronology },
      { column: BOUND_PIECES_DATA_LIST_COLUMNS.COPY_NUMBER, value: piece.copyNumber },
      { column: BOUND_PIECES_DATA_LIST_COLUMNS.ENUMERATION, value: piece.enumeration },
      {
        column: BOUND_PIECES_DATA_LIST_COLUMNS.EXPECTED_RECEIPT_DATE,
        value: piece.expectedReceiptDate,
      },
    ]),
  ];
};

describe('Receiving', () => {
  const flow = new ExecutionFlowManager();

  before('Create C502959 preconditions', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getAdminUserDetails().then((admin) => flow.set(R.ADMIN, admin));
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganization)
      .step(steps.fetchLocation)
      .step(steps.fetchMaterialType)
      .step(steps.fetchLoanType)
      .step(steps.fetchAcquisitionMethod)
      .step(steps.fetchPickupServicePoint)
      .step(steps.createOrder)
      .step(steps.createOrderLine)
      .step(steps.openOrder)
      .step(steps.setTitleFromOrderLine)
      .step(steps.createPieces)
      .step(steps.createOutstandingRequestForPiece2)
      .step(steps.receivePiecesViaApi)
      .step(steps.bindPiecesViaApi)
      .step(steps.createAuthorizedUser)
      .step(steps.loginAsAuthorizedUser);
  });

  after('Delete C502959 data (what can be deleted)', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C502959 Remove bound piece from ongoing order with transfer request',
    { tags: ['extendedPath', 'thunderjet', 'C502959'] },
    () => {
      const {
        boundItem,
        pieces: { all: pieces },
        requestItem,
        title,
      } = flow.ctx();

      const piece1 = pieces.find((piece) => piece.barcode !== flow.get(R.PIECES).piece2Barcode);
      const piece2 = pieces.find((piece) => piece.barcode === flow.get(R.PIECES).piece2Barcode);

      cy.log('< --- STEP 1 --- >');
      Receivings.selectFromResultsList(title.title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title.title);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.assertBoundItemsListColumns();

      cy.log('< --- STEP 2 --- >');
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      cy.log('< --- STEP 3 --- >');
      ReceivingDetails.clickBoundItemBarcodeLink(boundItem.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(boundItem.barcode);
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

      cy.log('< --- STEP 4 --- >');
      ItemRecordView.verifyRequestsCount(1);

      cy.log('< --- STEP 5 --- >');
      ItemRecordView.assertBoundPiecesDataContent(buildListConfig([piece1, piece2]));
      ItemRecordView.assertBoundPiecesResultsCount(PIECES_TOTAL);

      cy.log('< --- STEP 6 --- >');
      ItemRecordView.removePieceFromBoundItem(piece2.barcode);

      cy.log('< --- STEP 7 --- >');
      ItemRecordView.assertBoundPiecesDataContent(buildListConfig([piece1]));
      ItemRecordView.assertBoundPiecesResultsCount(1);

      cy.log('< --- STEP 8 --- >');
      cy.visit(getVisitOptions(flow));
      Receivings.waitLoading();
      Receivings.selectFromResultsList(title.title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title.title);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([piece2]);

      cy.log('< --- STEP 9 --- >');
      ReceivingDetails.openEditPieceModal({ section: 'received' });
      PieceForm.waitLoading(RECEIVING_PIECE_FORM_MODES.EDIT);
      cy.expect(Checkbox(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND).has({ checked: false }));
      cy.expect(
        KeyValue(RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST).has({
          value: KEY_VALUE_NO_VALUE_MESSAGE,
        }),
      );

      cy.log('< --- STEP 10 --- >');
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(requestItem.barcode);

      cy.log('< --- STEP 11 --- >');
      cy.visit(getVisitOptions(flow));
      Receivings.waitLoading();
      Receivings.selectFromResultsList(title.title);
      ReceivingDetails.clickBoundItemBarcodeLink(boundItem.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(boundItem.barcode);
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

      cy.log('< --- STEP 12 --- >');
      ItemRecordView.verifyRequestsCount(1);

      cy.log('< --- STEP 13 --- >');
      ItemRecordView.assertBoundPiecesDataContent(buildListConfig([piece1]));
      ItemRecordView.assertBoundPiecesResultsCount(1);
      ItemRecordView.clickBarcodeLinkInBoundPiecesDataAccordion();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
    },
  );
});

function getPreconditionSteps() {
  const createOrganization = (flow) => {
    const organization = { ...NewOrganization.getDefaultOrganization() };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
  };

  const fetchLocation = (flow) => {
    return InventoryInstances.getLocations({ limit: 2 }).then((locations) => flow.set(R.LOCATIONS, locations));
  };

  const fetchMaterialType = (flow) => {
    return cy.getBookMaterialType().then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
  };

  const fetchLoanType = (flow) => {
    return cy.getLoanTypes({ limit: 1 }).then((loanTypes) => flow.set(R.LOAN_TYPE, loanTypes[0]));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi()
      .then(({ body }) => flow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
  };

  const fetchPickupServicePoint = (flow) => {
    return ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation==true' }).then(
      (servicePoints) => flow.set(R.PICKUP_SERVICE_POINT, servicePoints[0]),
    );
  };

  const createOrder = (flow) => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOngoingOrder({ vendorId: flow.get(R.ORGANIZATION).id }),
      approved: true,
    }).then((entity) => flow.set(R.ORDER, entity, () => Orders.deleteOrderViaApi(entity.id, false)));
  };

  const createOrderLine = (flow) => {
    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId: flow.get(R.ORDER).id,
      checkinItems: true,
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
      locations: [
        {
          locationId: flow.get(R.LOCATIONS)[0].id,
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
        currency: flow.get(R.LOCALE).currency,
      },
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORGANIZATION).id,
        volumes: [],
      },
    }).then((entity) => flow.set(R.ORDER_LINE, entity));
  };

  const openOrder = (flow) => {
    Orders.updateOrderViaApi({
      ...flow.get(R.ORDER),
      workflowStatus: ORDER_STATUSES.OPEN,
    });

    const cleanup = (orderLine) => {
      OrderLines.deleteOrderLineViaApi(orderLine.id);
      InventoryHoldings.deleteHoldingRecordViaApi(orderLine.locations[0].holdingId);
      InventoryInstance.deleteInstanceViaApi(orderLine.instanceId);
    };

    return OrderLines.getOrderLineByIdViaApi(flow.get(R.ORDER_LINE).id).then((orderLine) => flow.set(R.ORDER_LINE, orderLine, cleanup.bind(null, orderLine)));
  };

  const setTitleFromOrderLine = (flow) => {
    return Receivings.getTitleByPoLineIdViaApi(flow.get(R.ORDER_LINE).id).then((title) => flow.set(R.TITLE, title));
  };

  const createPieces = (flow) => {
    const piece2Barcode = `AT_piece2_item_barcode-${getRandomPostfix()}`;

    return Pieces.upsertOrderPiecesBatchViaApi(
      [
        {
          ...NewPiece.defaultPiece,
          id: uuid(),
          poLineId: flow.get(R.ORDER_LINE).id,
          titleId: flow.get(R.TITLE).id,
          locationId: flow.get(R.LOCATIONS)[1].id,
          comment: 'Piece #1',
        },
        {
          ...NewPiece.defaultPiece,
          id: uuid(),
          poLineId: flow.get(R.ORDER_LINE).id,
          titleId: flow.get(R.TITLE).id,
          locationId: flow.get(R.LOCATIONS)[1].id,
          comment: 'Piece #2',
          barcode: piece2Barcode,
        },
      ],
      { createItem: true },
    ).then((data) => {
      const cleanup = createPiecesCleanup(data.pieces);

      flow.set(R.PIECES, { all: data.pieces, piece2Barcode }, cleanup);

      InventoryItems.getItemByIdViaApi(data.pieces[1].itemId).then((item) => flow.set(R.REQUEST_ITEM, item));
    });
  };

  const receivePiecesViaApi = (flow) => {
    return Pieces.updateOrderPiecesStatusesBatchViaApi({
      pieceIds: flow.get(R.PIECES).all.map((piece) => piece.id),
      receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
    });
  };

  const createOutstandingRequestForPiece2 = (flow) => {
    return Requests.createNewRequestViaApi(createItemLevelRequestBody(flow)).then((request) => flow.set(R.REQUEST, request.body, createRequestCleanup(request.body.id)));
  };

  const bindPiecesViaApi = (flow) => {
    const boundBarcode = `bound-${getRandomPostfix()}`;

    return Pieces.bindPiecesViaApi({
      bindItem: {
        barcode: boundBarcode,
        holdingId: flow.get(R.ORDER_LINE).locations[0].holdingId,
        materialTypeId: flow.get(R.MATERIAL_TYPE).id,
        permanentLoanTypeId: flow.get(R.LOAN_TYPE).id,
      },
      bindPieceIds: flow.get(R.PIECES).all.map((piece) => piece.id),
      instanceId: flow.get(R.ORDER_LINE).instanceId,
      poLineId: flow.get(R.ORDER_LINE).id,
      requestsAction: 'Transfer',
    })
      .then(({ itemId }) => InventoryItems.getItemByIdViaApi(itemId))
      .then((boundItem) => flow.set(R.BOUND_ITEM, boundItem, () => InventoryItems.deleteItemViaApi(boundItem.id)));
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ])
      .then((user) => flow.set(R.RUN_USER, user, () => Users.deleteViaApi(user.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.RUN_USER);

    return cy.login(user.username, user.password, {
      path: getVisitOptions(flow),
      waiter: Receivings.waitLoading,
    });
  };

  return {
    createOrganization,
    fetchLocation,
    fetchMaterialType,
    fetchLoanType,
    fetchAcquisitionMethod,
    fetchPickupServicePoint,
    createOrder,
    createOrderLine,
    openOrder,
    setTitleFromOrderLine,
    createPieces,
    receivePiecesViaApi,
    createOutstandingRequestForPiece2,
    bindPiecesViaApi,
    createAuthorizedUser,
    loginAsAuthorizedUser,
  };
}
