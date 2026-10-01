import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  NO_BARCODE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
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
    piece1: {},
    piece2: {},
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
            quantity: 2,
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

  const changePieceStatus = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
      if (pieces && pieces.length > 0) {
        testData.piece1 = pieces[0];
        return Pieces.updateOrderPieceViaApi({
          ...testData.piece1,
          receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
        });
      }
      return null;
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(changePieceStatus);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditDelete.gui,
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

  it(
    'C423617 Change piece status from "Unreceivable" to "Expected" when related PO line has Quantity > 1 (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423617'] },
    () => {
      // Steps 1-3: Search for the Title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 4: Click on the piece record
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView({ isExpected: false });

      // Step 5: Move piece to expected
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickExpectButton();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);

      // Step 6: Open Instance details
      ReceivingDetails.openInstanceDetails();

      // Step 7: Expand holdings accordion and check item statuses
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);

      // Step 8: Click "View holdings"
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();

      // Step 9: Check Receipt status in PO line
      HoldingsRecordView.openHotlinkToPOL(testData.orderLine.poLineNumber);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
          },
        ],
      });
    },
  );
});
