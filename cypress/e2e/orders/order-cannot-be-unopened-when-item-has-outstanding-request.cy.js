import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import UnopenConfirmationModal from '../../support/fragments/orders/modals/unopenConfirmationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import EditRequest from '../../support/fragments/requests/edit-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  const expectedApiError = {
    expectedStatus: 422,
    expectedErrorCode: OrderStates.thereAreRequestsOnItem,
    expectedErrorMessage: OrderStates.thereAreRequestsOnItemAPIMessage,
  };
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C784420_FolioInstance_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      testData.location = locations[0];
    });
    ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
      testData.servicePoint = servicePoint;
    });

    // Precondition 1: Open order with one POL (Synchronized, Quantity = 1, Instance, Holdings, Item)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        const orderLine = {
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            checkinItems,
            quantity: QUANTITY,
          }),
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
          locations: [
            {
              locationId: testData.location.id,
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
          ],
        };

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(createdOrderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    // Precondition 3: User with an assigned service point and required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
      Permissions.uiRequestsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        testData.user.userId,
        testData.servicePoint.id,
      );
    });

    // Precondition 2: Related item has an outstanding request
    cy.then(() => {
      cy.getItems({
        query: `"purchaseOrderLineIdentifier"=="${testData.orderLine.id}"`,
      }).then((item) => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: item.holdingsRecordId,
          instanceId: testData.orderLine.instanceId,
          itemId: item.id,
          pickupServicePointId: testData.servicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.HOLD,
          requesterId: testData.user.userId,
        }).then(({ body }) => {
          testData.requestId = body.id;
        });
      });
    });

    // Precondition 4: User is on "Orders" pane with the search result for created order
    cy.then(() => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Requests.deleteRequestViaApi(testData.requestId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C784420 Order cannot be unopened when a related item has an outstanding request (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C784420'] },
    () => {
      // Step 1: Click on Order number from precondition
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Unopen"
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });

      // Step 3: Click "Delete items" button
      cy.intercept('PUT', `/orders/composite-orders/${testData.order.id}?deleteHoldings=false`).as(
        'unopenOrderDeleteItems',
      );
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      cy.wait('@unopenOrderDeleteItems').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, expectedApiError);
      });
      InteractorsTools.checkCalloutErrorMessage(OrderStates.orderHasAssociatedRequests);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 4: Click "Actions" -> "Unopen" and click "Delete Holdings and items" button
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });
      cy.intercept('PUT', `/orders/composite-orders/${testData.order.id}?deleteHoldings=true`).as(
        'unopenOrderDeleteHoldings',
      );
      UnopenConfirmationModal.confirm({ keepHoldings: false });
      cy.wait('@unopenOrderDeleteHoldings').then((interception) => {
        OrderDetails.checkApiErrorResponse(interception, expectedApiError);
      });
      InteractorsTools.checkCalloutErrorMessage(OrderStates.orderHasAssociatedRequests);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 5: Click on title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.instanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: QUANTITY });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });

      // Step 6: Navigate to the "Requests" app, search for the request from Preconditions and click on it
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.instanceTitle);
      Requests.selectFirstRequest(testData.instanceTitle);

      // Step 7: Click "Actions" -> "Cancel request" and click "Confirm" in the "Confirm request cancellation" pop up
      RequestDetail.openActions();
      RequestDetail.openCancelRequest();
      RequestDetail.confirmRequestCancellation();
      RequestDetail.checkRequestStatus(EditRequest.requestStatuses.CLOSED_CANCELLED);

      // Step 8: Navigate to the Order, click "Actions" -> "Unopen" and click "Delete items" button
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 9: Click on title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.instanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
    },
  );
});
