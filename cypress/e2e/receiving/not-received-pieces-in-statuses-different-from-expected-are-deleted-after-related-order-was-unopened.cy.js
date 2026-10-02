import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    pieces: [],
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

  const createOrderWithClaimingOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: 5,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: true,
          claimingInterval: 1,
        });
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
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

        return Receiving.getPiecesViaApi(orderLine.id);
      })
      .then((pieces) => {
        testData.pieces = [...pieces].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      });
  };

  // Pieces are listed by sequence number, so sequences 1-4 get "Late", "Claim delayed",
  // "Claim sent" and "Unreceivable", and sequence 5 stays "Expected"
  const changePiecesStatuses = () => {
    [
      RECEIVING_PIECE_STATUSES.LATE,
      RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
      RECEIVING_PIECE_STATUSES.CLAIM_SENT,
      RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
    ].forEach((receivingStatus, index) => {
      Pieces.updateOrderPiecesStatusesBatchViaApi({
        pieceIds: [testData.pieces[index].id],
        receivingStatus,
      });
    });
  };

  const unopenOrder = () => {
    return Orders.getOrderByIdViaApi(testData.order.id).then((order) => Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiReceivingView.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(fetchReferenceData)
      .then(createOrderWithClaimingOrderLine)
      .then(openOrder)
      .then(changePiecesStatuses)
      .then(unopenOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstance.deleteInstanceViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C736710 Not received pieces in statuses different from "Expected" are deleted after related order was unopened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C736710'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      // Step 1: Navigate to the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);

      // Step 2: Open the order from the PO line details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.waitLoading();
      OrderLines.viewPO();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 3: Select "Receive" option, click on receiving title name
      OrderDetails.openReceivingsPage();
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(5);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);
      ReceivingDetails.checkExpectedTableContent(
        [1, 2, 3, 4, 5].map(() => ({ status: RECEIVING_PIECE_STATUSES.EXPECTED })),
      );
    },
  );
});
