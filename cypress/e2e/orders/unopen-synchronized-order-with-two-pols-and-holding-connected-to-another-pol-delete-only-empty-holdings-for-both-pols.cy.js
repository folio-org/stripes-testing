import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
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
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const POL_LIMIT = 3;
  const QUANTITY = 1;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  let testData;

  const getOrderLine = ({ orderId, title, instanceId, locations }) => ({
    ...BasicOrderLine.getDefaultOrderLine({
      title,
      instanceId,
      purchaseOrderId: orderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      checkinItems,
      quantity: QUANTITY * locations.length,
    }),
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
      materialType: testData.materialType.id,
      materialSupplier: testData.organization.id,
      volumes: [],
    },
    locations: locations.map((location) => ({
      ...location,
      quantity: QUANTITY,
      quantityPhysical: QUANTITY,
    })),
  });

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      firstInstanceTitle: `AT_C1045971_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1045971_FolioInstance_2_${getRandomPostfix()}`,
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
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.firstLocation, testData.secondLocation] = locations;
    });

    // Precondition 2: Open Order #1 with one POL (Synchronized, Quantity = 1, Instance, Holdings, Item)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.firstOrder = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({
            orderId: order.id,
            title: testData.firstInstanceTitle,
            locations: [{ locationId: testData.firstLocation.id }],
          }),
        ).then(({ id }) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(id).then((orderLine) => {
            testData.firstOrderLine = orderLine;
          });
        });
      });
    });

    // Precondition 3: Open Order #2 with two POLs (Quantity = 2 each)
    // (#1 - same Title as Order #1, existing holding + new holding; #2 - new Title, any two locations)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.secondOrder = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({
            orderId: order.id,
            title: testData.firstInstanceTitle,
            instanceId: testData.firstOrderLine.instanceId,
            locations: [
              { holdingId: testData.firstOrderLine.locations[0].holdingId },
              { locationId: testData.secondLocation.id },
            ],
          }),
        ).then(({ id }) => {
          testData.secondOrderFirstLineId = id;
        });
        OrderLines.createOrderLineViaApi(
          getOrderLine({
            orderId: order.id,
            title: testData.secondInstanceTitle,
            locations: [
              { locationId: testData.firstLocation.id },
              { locationId: testData.secondLocation.id },
            ],
          }),
        ).then(({ id }) => {
          testData.secondOrderSecondLineId = id;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.secondOrderFirstLineId).then((orderLine) => {
        testData.secondOrderFirstLine = orderLine;
      });
      OrderLines.getOrderLineByIdViaApi(testData.secondOrderSecondLineId).then((orderLine) => {
        testData.secondOrderSecondLine = orderLine;
      });
    });

    // Precondition 4: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 5: User is on "Orders" pane with the search result for the Order #2
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.secondOrder.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    OrderLinesLimit.setPOLLimitViaApi(1);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.firstInstanceTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.secondInstanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1045971 Unopen a synchronized order with two PO lines when one of the holdings is connected to another POL (Delete only empty holdings for both POLs) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1045971', 'nonParallel'] },
    () => {
      // Step 1: Click on the Order #2 from Preconditions
      Orders.selectFromResultsList(testData.secondOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Unopen"
      OrderDetails.unOpenOrder({
        orderNumber: testData.secondOrder.poNumber,
        checkinItems,
        confirm: false,
      });

      // Step 3: Click "Delete Holdings and items" button
      UnopenConfirmationModal.confirm({ keepHoldings: false });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.secondOrder.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 4: Click on the PO line #1 record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.secondLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 5: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name, count: 1 });
      InventoryInstance.verifyHoldingsAbsent(testData.secondLocation.name);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.firstLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.secondOrderFirstLine.poLineNumber },
        { polNumber: testData.firstOrderLine.poLineNumber },
      ]);

      // Step 6: Navigate back to the Order #2 and click on the PO line #2 record in the "PO lines" accordion
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.secondLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 7: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.secondOrderSecondLine.poLineNumber },
      ]);

      // Step 8: Navigate to the Order #1 and click on the PO line record in the "PO lines" accordion
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.firstOrder.poNumber);
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 9: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.firstLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.secondOrderFirstLine.poLineNumber },
        { polNumber: testData.firstOrderLine.poLineNumber },
      ]);
    },
  );
});
