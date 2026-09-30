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
import { Receivings } from '../../support/fragments/receiving';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT];
  let testData;

  const getOrderLine = ({ orderId, title, createInventory }) => ({
    ...BasicOrderLine.getDefaultOrderLine({
      title,
      purchaseOrderId: orderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      checkinItems,
      quantity: QUANTITY,
    }),
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    physical: {
      createInventory,
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
  });

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      firstInstanceTitle: `AT_C1009052_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1009052_FolioInstance_2_${getRandomPostfix()}`,
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

    // Precondition 1: Open Order #1 with one POL (Independent, Instance, Holdings, Item)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.firstOrder = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({
            orderId: order.id,
            title: testData.firstInstanceTitle,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          }),
        ).then(({ id }) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(id).then((orderLine) => {
            testData.firstOrderLine = orderLine;
          });
        });
      });
    });

    // Precondition 2: One piece with "Create item" has been added to the Title from POL of Order #1
    cy.then(() => {
      Receivings.addPieceViaApi({
        poLineId: testData.firstOrderLine.id,
        poLineNumber: testData.firstOrderLine.poLineNumber,
        format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
        holdingId: testData.firstOrderLine.locations[0].holdingId,
        searchParams: { createItem: 'true' },
      });
    });

    // Precondition 3: Open Order #2 with one POL (Independent, Instance, Holdings)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.secondOrder = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({
            orderId: order.id,
            title: testData.secondInstanceTitle,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          }),
        ).then(({ id }) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(id).then((orderLine) => {
            testData.secondOrderLine = orderLine;
          });
        });
      });
    });

    // Precondition 4: One piece has been added to the Title from POL of Order #2
    cy.then(() => {
      Receivings.addPieceViaApi({
        poLineId: testData.secondOrderLine.id,
        poLineNumber: testData.secondOrderLine.poLineNumber,
        format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
        holdingId: testData.secondOrderLine.locations[0].holdingId,
      });
    });

    // Precondition 5: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 6: User is on "Orders" pane with the search result for the Order #1
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.firstOrder.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.firstInstanceTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.secondInstanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1009052 Unopen order with independent workflow and a related piece (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1009052'] },
    () => {
      // Step 1: Click on the Order #1 from Preconditions
      Orders.selectFromResultsList(testData.firstOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Unopen"
      OrderDetails.unOpenOrder({
        orderNumber: testData.firstOrder.poNumber,
        hasRelations: false,
        confirm: false,
      });

      // Step 3: Click "Submit" in the "Unopen - purchase order" modal
      UnopenConfirmationModal.confirm({ submit: true });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.firstOrder.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 4: Click on the PO line record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 5: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.firstOrderLine.poLineNumber },
      ]);

      // Step 6: Navigate back to "Orders" app, search for the Order #2 and click on it
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.secondOrder.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 7: Click "Actions" -> "Unopen"
      OrderDetails.unOpenOrder({
        orderNumber: testData.secondOrder.poNumber,
        hasRelations: false,
        confirm: false,
      });

      // Step 8: Click "Submit" in the "Unopen - purchase order" modal
      UnopenConfirmationModal.confirm({ submit: true });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.secondOrder.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 9: Click on the PO line record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 10: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.secondOrderLine.poLineNumber },
      ]);
    },
  );
});
