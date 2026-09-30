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
import Requests from '../../support/fragments/requests/requests';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const POL_LIMIT = 3;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  let testData;

  const getOrderLine = ({ orderId, title, quantity }) => ({
    ...BasicOrderLine.getDefaultOrderLine({
      title,
      purchaseOrderId: orderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      checkinItems,
      quantity,
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
        quantity,
        quantityPhysical: quantity,
      },
    ],
  });

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      firstInstanceTitle: `AT_C1030048_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1030048_FolioInstance_2_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();

    // Precondition 1: "Purchase order lines limit" is set to more than 2
    OrderLinesLimit.setPOLLimitViaApi(POL_LIMIT);

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

    // Precondition 2: Open order with two POLs (Synchronized, Instance, Holdings, Item; #1 - Quantity = 1, #2 - Quantity = 2)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({ orderId: order.id, title: testData.firstInstanceTitle, quantity: 1 }),
        );
        OrderLines.createOrderLineViaApi(
          getOrderLine({ orderId: order.id, title: testData.secondInstanceTitle, quantity: 2 }),
        ).then(({ id }) => {
          testData.secondOrderLineId = id;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 4: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });

    // Precondition 3: One of the items from POL #2 has an outstanding request
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.secondOrderLineId).then(({ instanceId }) => {
        testData.secondInstanceId = instanceId;
      });
      cy.getItems({
        query: `"purchaseOrderLineIdentifier"=="${testData.secondOrderLineId}"`,
      }).then((item) => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: item.holdingsRecordId,
          instanceId: testData.secondInstanceId,
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

    // Precondition 5: User is on "Orders" pane with the search result for created order
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
    OrderLinesLimit.setPOLLimitViaApi(1);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.firstInstanceTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.secondInstanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1030048 Order with two PO lines cannot be unopened when one of the related items has an outstanding request (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1030048', 'nonParallel'] },
    () => {
      // Step 1: Click on Order number from precondition
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Unopen" and click "Delete items" button
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      InteractorsTools.checkCalloutErrorMessage(OrderStates.orderHasAssociatedRequests);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      InteractorsTools.closeCalloutMessage();

      // Step 3: Click "Actions" -> "Unopen" and click "Delete holdings and items" button
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });
      UnopenConfirmationModal.confirm({ keepHoldings: false });
      InteractorsTools.checkCalloutErrorMessage(OrderStates.orderHasAssociatedRequests);
      InteractorsTools.closeCalloutMessage();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 4: Click on the PO line #1 record and click on the title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });

      // Step 5: Navigate back to the Order, click on the PO line #2 record and click on the title name link
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 2 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }, { status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
    },
  );
});
