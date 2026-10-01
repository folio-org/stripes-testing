import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  HOLDING_RECEIVING_HISTORY,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  NO_VALUE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import { InstanceRecordView } from '../../support/fragments/inventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    piece: {},
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
      reEncumber: true,
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
      });
  };

  const openOrderAndReceivePiece = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;

        return Receiving.getPiecesViaApi(orderLine.id);
      })
      .then((pieces) => {
        testData.piece = pieces[0];

        return Receiving.receivePieceViaApi({
          poLineId: testData.orderLine.id,
          pieces: [{ id: testData.piece.id, displayOnHolding: false }],
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLine)
        .then(openOrderAndReceivePiece);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Receiving.unreceivePiecesViaApi({
        poLineId: testData.orderLine.id,
        pieceIds: [testData.piece.id],
      }).then(() => {
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

  it(
    'C464324 Making "Display to public" checkbox visible on Holdings for already received piece with "Display on holdings" = false (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C464324'] },
    () => {
      // Steps 1: Click on the PO line and open the instance record
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.openInstanceInPOL(testData.orderLine.titleOrPackage);

      // Step 2: Expand Holdings and verify item status
      InstanceRecordView.expandHoldings(testData.location.name);
      InventoryInstance.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 3-4: Click "View holdings" and verify "Receiving history" accordion absence
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.expandReceivingHistoryAccordion();
      HoldingsRecordView.checkAbsentRecordInReceivingHistory();

      // Step 5: Navigate to Orders app and select receive
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      OrderLines.backToEditingOrder();
      Orders.receiveOrderViaActions();

      // Step 6: Select title in the search result
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);

      // Step 7: Click on the piece in the "Received" accordion and verify checkboxes presence and state
      Receiving.selectRecordInReceivedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        true,
      );
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        false,
      );

      // Step 8: Check "Display on holdings" and verify "Display to public" checkbox becomes visible
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        true,
      );
      EditPieceModal.verifyCheckboxState(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        true,
      );
      EditPieceModal.verifyCheckboxState(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        false,
      );

      // Step 9: Check "Display to public" and verify its state
      EditPieceModal.checkDisplayToPublicCheckbox();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC, true);

      // Step 10: Save the record
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.waitLoading();

      // Step 11: Click Title link and verify item status
      Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);
      InstanceRecordView.expandHoldings(testData.location.name);
      InventoryInstance.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 12: Click "View holdings"
      InventoryInstance.viewHoldings();

      // Step 13: Verify "Receiving history" accordion
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkReceivingHistoryValues({
        enumeration: NO_VALUE,
        receiptDate: new Date().toLocaleDateString('en-US'),
        publicDisplay: true,
        source: HOLDING_RECEIVING_HISTORY.RECEIVING,
      });
    },
  );
});
