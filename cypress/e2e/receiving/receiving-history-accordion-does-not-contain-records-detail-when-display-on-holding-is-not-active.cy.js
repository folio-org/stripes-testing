import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const PIECE_DETAILS_TO_FILL = {
  enumeration: `Autotest_enumeration_${getRandomPostfix()}`,
  chronology: `Autotest_chronology_${getRandomPostfix()}`,
};

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
        testData.piece = pieces[0];
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization().then(fetchReferenceData).then(createOrderWithOrderLine).then(openOrder);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
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
    'C388530 "Receiving history" accordion does not contain record\'s detail when "Display on holding" option is NOT active in "Quick receive" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C388530'] },
    () => {
      // Step 1: Click "PO number" link and check order status
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Open "Receiving" page via Actions -> Receive
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();

      // Step 3: Click on the title, verify accordions on the details pane
      ReceivingDetails.waitLoading();
      ReceivingDetails.checkReceivingDetails();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 4: Click on the record in "Expected" accordion, verify Edit piece form
      Receiving.selectRecordInExpectedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView();

      // Step 5: Fill in Enumeration/Chronology, "Display on holding" stays unchecked
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION]: PIECE_DETAILS_TO_FILL.enumeration,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY]: PIECE_DETAILS_TO_FILL.chronology,
      });
      EditPieceModal.verifyCheckboxState(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        false,
      );

      // Step 6: Expand dropdown next to "Save & close" and select "Quick receive"
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePieceFromDropdown();
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.checkReceivedTableContent([
        {
          enumeration: PIECE_DETAILS_TO_FILL.enumeration,
          chronology: PIECE_DETAILS_TO_FILL.chronology,
        },
      ]);

      // Step 7: Click Title link, navigate to Inventory
      Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);

      // Step 8-9: Open holdings and verify "Receiving history" accordion does not contain the record
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.expandReceivingHistoryAccordion();
      HoldingsRecordView.checkAbsentRecordInReceivingHistory();
    },
  );
});
