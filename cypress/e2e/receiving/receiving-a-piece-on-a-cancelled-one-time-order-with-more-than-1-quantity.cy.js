import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  ORDER_SYSTEM_CLOSING_REASONS,
  COMMON_BUTTON_LABELS,
  NO_VALUE,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  NO_BARCODE,
} from '../../support/constants';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import OrderClosedModal from '../../support/fragments/receiving/modals/orderClosedModal';
import InteractorsTools from '../../support/utils/interactorsTools';
import Permissions from '../../support/dictionary/permissions';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const barcode = `barcode_${getRandomPostfix()}`;

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }))
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            quantity: 2,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };
  const cancelOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.CLOSED,
      closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(cancelOrder);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
        Receiving.unreceivePiecesViaApi({
          poLineId: testData.orderLine.id,
          pieceIds: pieces.map((piece) => piece.id),
        }).then(() => {
          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
          Orders.updateOrderViaApi(
            {
              ...testData.order,
              workflowStatus: ORDER_STATUSES.PENDING,
            },
            true,
            false,
          );
          Orders.deleteOrderByOrderNumberViaApi(testData.order.poNumber);
          InventoryInstance.deleteInstanceViaApi(testData.orderLine.instanceId);
          Organizations.deleteOrganizationViaApi(testData.organization.id);
          Users.deleteViaApi(testData.user.userId);
        });
      });
    });
  });

  it(
    'C434081 Receiving one piece on a cancelled one-time order with >1 quantity (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C434081'] },
    () => {
      // Steps 1-2: Search for the Title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      Receiving.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkReceivedTableContent([]);

      // Step 3: Click on the piece record
      Receiving.selectRecordInExpectedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView();

      // Step 4: Receive the piece
      EditPieceModal.fillPieceDetails({ [RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE]: barcode });
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePieceAdd();
      OrderClosedModal.handleOrderClosedModal({ action: COMMON_BUTTON_LABELS.CONTINUE });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceReceivedSuccessfully);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      Receiving.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED });
      ReceivingDetails.checkReceivedTableContent([
        {
          displaySummary: NO_VALUE,
        },
      ]);

      // Step 5: Check Receipt status in PO line
      ReceivingDetails.openOrderLineDetails(testData.orderLine.poLineNumber);
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.CANCELLED },
        ],
      });

      // Step 6-7: Check Item statuses in Inventory
      OrderLineDetails.openInventoryItem();
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.IN_PROCESS);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ORDER_CLOSED);
    },
  );
});
