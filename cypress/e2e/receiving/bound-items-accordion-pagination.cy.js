import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_TITLE_SEARCH_INDEXES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { InventoryHoldings, InventoryInstance } from '../../support/fragments/inventory';
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
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';

const R = {
  ORGANIZATION: 'organization',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  LOAN_TYPE: 'loanType',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  PIECES: 'pieces',
  USER: 'user',
  TITLE: 'title',
};

const BOUND_ITEMS_LIST_LIMIT = 20;
const PIECES_TOTAL = 42;

describe('Receiving', () => {
  const flow = new ExecutionFlowManager();

  before('Create C494012 preconditions', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganization)
      .step(steps.fetchLocation)
      .step(steps.fetchMaterialType)
      .step(steps.fetchLoanType)
      .step(steps.fetchAcquisitionMethod)
      .step(steps.createOrder)
      .step(steps.createOrderLine)
      .step(steps.openOrder)
      .step(steps.setTitleFromOrderLine)
      .step(steps.createIndependentPieces)
      .step(steps.receivePiecesViaApi)
      .step(steps.bindPiecesViaApi)
      .step(steps.createAuthorizedUser)
      .step(steps.loginAsAuthorizedUser);
  });

  after('Delete C494012 data (what can be deleted)', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C494012 Check pagination in "Bound items" accordion (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C494012'] },
    () => {
      const { title } = flow.ctx();

      const assertBoundItemsList = (recordsCount, paginationState) => {
        ReceivingDetails.assertBoundItemsListColumns();
        ReceivingDetails.assertBoundItemsListCount(recordsCount);
        ReceivingDetails.assertBoundItemsPaginationControlsDisabled(paginationState);
      };

      // Step 1
      Receivings.selectFromResultsList(title.title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title.title);
      ReceivingDetails.checkReceivedTableContent([]);
      assertBoundItemsList(BOUND_ITEMS_LIST_LIMIT, { next: false, previous: true });

      // Step 2
      ReceivingDetails.clickNextPageButtonInBoundItemsAccordion();
      assertBoundItemsList(BOUND_ITEMS_LIST_LIMIT, { next: false, previous: false });

      // Step 3
      ReceivingDetails.clickNextPageButtonInBoundItemsAccordion();
      assertBoundItemsList(PIECES_TOTAL - 2 * BOUND_ITEMS_LIST_LIMIT, {
        next: true,
        previous: false,
      });

      // Step 4
      ReceivingDetails.clickPreviousPageButtonInBoundItemsAccordion();
      ReceivingDetails.clickPreviousPageButtonInBoundItemsAccordion();
      assertBoundItemsList(BOUND_ITEMS_LIST_LIMIT, { next: false, previous: true });
    },
  );
});

function getPreconditionSteps() {
  const createOrganization = (flow) => {
    const organization = { ...NewOrganization.getDefaultOrganization() };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
  };

  const fetchLocation = (flow) => {
    return cy.getLocations({ limit: 1 }).then((location) => flow.set(R.LOCATION, location));
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

  const createOrder = (flow) => {
    const order = {
      ...NewOrder.getDefaultOngoingOrder({
        vendorId: flow.get(R.ORGANIZATION).id,
      }),
      approved: true,
    };

    return Orders.createOrderViaApi(order).then((entity) => flow.set(R.ORDER, entity, () => Orders.deleteOrderViaApi(entity.id)));
  };

  const createOrderLine = (flow) => {
    const orderLine = {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId: flow.get(R.ORDER).id,
      checkinItems: true, // "Receiving workflow" = Independent order and receipt quantity
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
      locations: [
        {
          locationId: flow.get(R.LOCATION).id,
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
    };

    return OrderLines.createOrderLineViaApi(orderLine).then((entity) => flow.set(R.ORDER_LINE, entity));
  };

  const openOrder = (flow) => {
    Orders.updateOrderViaApi({
      ...flow.get(R.ORDER),
      workflowStatus: ORDER_STATUSES.OPEN,
    });

    OrderLines.getOrderLineByIdViaApi(flow.get(R.ORDER_LINE).id).then((orderLine) => flow.set(R.ORDER_LINE, orderLine, () => {
      OrderLines.deleteOrderLineViaApi(orderLine.id);
      InventoryHoldings.deleteHoldingRecordViaApi(orderLine.locations[0].holdingId);
      InventoryInstance.deleteInstanceViaApi(orderLine.instanceId);
    }));
  };

  const setTitleFromOrderLine = (flow) => {
    return Receivings.getTitleByPoLineIdViaApi(flow.get(R.ORDER_LINE).id).then((title) => flow.set(R.TITLE, title));
  };

  const createIndependentPieces = (flow) => {
    const cleanupPieces = (pieces) => pieces.forEach((piece) => Pieces.deleteOrderPieceViaApi(piece.id));

    return Pieces.upsertOrderPiecesBatchViaApi(
      Array.from({ length: PIECES_TOTAL }, (_, index) => ({
        ...NewPiece.defaultPiece,
        id: uuid(),
        poLineId: flow.get(R.ORDER_LINE).id,
        titleId: flow.get(R.TITLE).id,
        holdingId: flow.get(R.ORDER_LINE).locations[0].holdingId,
        comment: `Piece ${index + 1}`,
      })),
    ).then((data) => flow.set(R.PIECES, data.pieces, () => cleanupPieces(data.pieces)));
  };

  const receivePiecesViaApi = (flow) => {
    return Pieces.updateOrderPiecesStatusesBatchViaApi({
      pieceIds: flow.get(R.PIECES).map((piece) => piece.id),
      receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
    });
  };

  const bindPiecesViaApi = (flow) => {
    const pieces = flow.get(R.PIECES);
    const materialTypeId = flow.get(R.MATERIAL_TYPE).id;
    const permanentLoanTypeId = flow.get(R.LOAN_TYPE).id;

    const cleanupData = {
      itemIds: [],
      pieceIds: [],
    };

    const consumeIds = ({ boundPieceIds, itemId }) => {
      cleanupData.itemIds.push(itemId);
      cleanupData.pieceIds.push(...boundPieceIds);
    };

    const cleanup = ({ pieceIds, itemIds }) => {
      pieceIds.forEach((pieceId) => Pieces.deleteBoundPieceViaApi(pieceId));
      itemIds.forEach((itemId) => cy.deleteItemViaApi(itemId));
    };

    cy.then(() => {
      pieces.forEach((piece) => {
        const dto = {
          bindItem: {
            barcode: `barcode-${piece.id}`,
            holdingId: piece.holdingId,
            materialTypeId,
            permanentLoanTypeId,
          },
          bindPieceIds: [piece.id],
          instanceId: flow.get(R.ORDER_LINE).instanceId,
          poLineId: flow.get(R.ORDER_LINE).id,
        };

        Pieces.bindPiecesViaApi(dto).then(consumeIds);
      });
    }).then(() => flow.toCleanup('tempData', () => cleanup(cleanupData)));
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([Permissions.uiInventoryViewInstances.gui, Permissions.uiReceivingView.gui])
      .then((user) => flow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.USER);

    return cy.login(user.username, user.password, {
      path: {
        url: TopMenu.receivingPath,
        qs: {
          qindex: RECEIVING_TITLE_SEARCH_INDEXES.POL_NUMBER,
          query: flow.get(R.ORDER_LINE).poLineNumber,
        },
      },
      waiter: Receivings.waitLoading,
    });
  };

  return {
    createOrganization,
    fetchLocation,
    fetchMaterialType,
    fetchLoanType,
    fetchAcquisitionMethod,
    createOrder,
    createOrderLine,
    openOrder,
    receivePiecesViaApi,
    bindPiecesViaApi,
    setTitleFromOrderLine,
    createIndependentPieces,
    createAuthorizedUser,
    loginAsAuthorizedUser,
  };
}
