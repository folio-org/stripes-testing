import {
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const FIRST_LOCATION_QUANTITY = 2;
  const SECOND_LOCATION_QUANTITY = 3;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C1030049_FolioInstance_${getRandomPostfix()}`,
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
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.firstLocation, testData.secondLocation] = locations;
    });
    ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
      testData.servicePoint = servicePoint;
    });

    // Precondition 1: Open order with one POL (Synchronized, Quantity = 5, Loc 1 - 2, Loc 2 - 3, Instance, Holdings, Item)
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
            quantity: FIRST_LOCATION_QUANTITY + SECOND_LOCATION_QUANTITY,
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
              locationId: testData.firstLocation.id,
              quantity: FIRST_LOCATION_QUANTITY,
              quantityPhysical: FIRST_LOCATION_QUANTITY,
            },
            {
              locationId: testData.secondLocation.id,
              quantity: SECOND_LOCATION_QUANTITY,
              quantityPhysical: SECOND_LOCATION_QUANTITY,
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

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });

    // Precondition 2: One of the items from holding #2 (Loc 2) has an outstanding request
    cy.then(() => {
      cy.getHoldings({ query: `"instanceId"=="${testData.orderLine.instanceId}"` }).then(
        (holdings) => {
          const secondLocationHolding = holdings.find(
            ({ permanentLocationId }) => permanentLocationId === testData.secondLocation.id,
          );

          cy.getItems({ query: `"holdingsRecordId"=="${secondLocationHolding.id}"` }).then(
            (item) => {
              Requests.createNewRequestViaApi({
                fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
                holdingsRecordId: secondLocationHolding.id,
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
            },
          );
        },
      );
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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1030049 Order cannot be unopened when one of the related items has an outstanding request (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1030049'] },
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

      // Step 4: Click on the PO line record and click on the title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.instanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({
        title: testData.firstLocation.name,
        count: FIRST_LOCATION_QUANTITY,
      });
      InventoryInstance.checkHoldingTitle({
        title: testData.secondLocation.name,
        count: SECOND_LOCATION_QUANTITY,
      });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.firstLocation.name,
        records: Array(FIRST_LOCATION_QUANTITY).fill({ status: ITEM_STATUS_NAMES.ON_ORDER }),
      });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.secondLocation.name,
        records: Array(SECOND_LOCATION_QUANTITY).fill({ status: ITEM_STATUS_NAMES.ON_ORDER }),
      });
    },
  );
});
