import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import UnreceivableListEditForm from '../../support/fragments/receiving/unreceivableListEditForm';
import Users from '../../support/fragments/users/users';

const comment = `comment-${getRandomPostfix()}`;

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

  const changePieceStatus = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
      if (pieces && pieces.length > 0) {
        testData.piece = pieces[0];
        return Pieces.updateOrderPieceViaApi({
          ...testData.piece,
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
        .then(cancelOrder)
        .then(changePieceStatus);
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

  it(
    'C436831 Change piece status from "Uneceivable" to "Expected" for a cancelled one-time order with "1" quantity (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C436831'] },
    () => {
      // Steps 1: Search for the Title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      Receiving.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 2: Move piece to expected via full screen
      Receiving.clickActionsInUnreceivableSection();
      Receiving.selectExpectPieceInActionsMenu();
      UnreceivableListEditForm.waitLoading();
      UnreceivableListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: testData.orderLine.titleOrPackage,
      });
      UnreceivableListEditForm.clickUnreceivingItemCheckbox();
      UnreceivableListEditForm.fillInCommentField({ comment });
      UnreceivableListEditForm.clickExpectButton();
      Receiving.checkPurchaseOrderClosedWarning({ reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED });
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);
      ReceivingDetails.checkExpectedTableContent([{ comment }]);

      // Step 3: Check Receipt status in PO line
      ReceivingDetails.openOrderLineDetails(testData.orderLine.poLineNumber);
      OrderLineDetails.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
      });
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.CANCELLED },
        ],
      });

      // Step 4-5: Check Item status in Inventory
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkHoldingsTableContent({
        name: LOCATION_NAMES.MAIN_LIBRARY_UI,
        records: [
          {
            status: ITEM_STATUS_NAMES.ORDER_CLOSED,
          },
        ],
      });
    },
  );
});
