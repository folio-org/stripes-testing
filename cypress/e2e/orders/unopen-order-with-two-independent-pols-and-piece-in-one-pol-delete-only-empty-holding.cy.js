import {
  APPLICATION_NAMES,
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
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT];
  let testData;

  const getOrderLine = ({ orderId, title }) => ({
    ...BasicOrderLine.getDefaultOrderLine({
      title,
      purchaseOrderId: orderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      checkinItems,
      quantity: QUANTITY,
    }),
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
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
      firstInstanceTitle: `AT_C1273166_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1273166_FolioInstance_2_${getRandomPostfix()}`,
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

    // Precondition 2: Open order with two POLs (Independent workflow, Quantity = 1, Instance, Holdings)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          getOrderLine({ orderId: order.id, title: testData.firstInstanceTitle }),
        ).then(({ id }) => {
          testData.firstOrderLineId = id;
        });
        OrderLines.createOrderLineViaApi(
          getOrderLine({ orderId: order.id, title: testData.secondInstanceTitle }),
        ).then(({ id }) => {
          testData.secondOrderLineId = id;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });
    cy.then(() => {
      OrderLines.getOrderLineByIdViaApi(testData.firstOrderLineId).then((orderLine) => {
        testData.firstOrderLine = orderLine;
      });
      OrderLines.getOrderLineByIdViaApi(testData.secondOrderLineId).then((orderLine) => {
        testData.secondOrderLine = orderLine;
      });
    });

    // Precondition 3: One piece has been added to the Title from PO line #1 to the holding from POL
    cy.then(() => {
      Receivings.addPieceViaApi({
        poLineId: testData.firstOrderLine.id,
        poLineNumber: testData.firstOrderLine.poLineNumber,
        format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
        holdingId: testData.firstOrderLine.locations[0].holdingId,
      });
    });

    // Precondition 4: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 5: User is on "Orders" pane with the search result for the order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    OrderLinesLimit.setPOLLimitViaApi(1);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.firstInstanceTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.secondInstanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1273166 Unopen an order with two po lines with independent receiving workflow and related piece in one PO line (Delete only empty holding) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1273166', 'nonParallel'] },
    () => {
      // Step 1: Click on the Order from Preconditions
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Unopen" and click "Delete holdings" button
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems,
        confirm: false,
      });
      UnopenConfirmationModal.confirm({ keepHoldings: false });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 3: Click on the PO line #1 record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 4: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.firstOrderLine.poLineNumber },
      ]);

      // Step 5: Navigate back to the Order and click on the PO line #2 record in the "PO lines" accordion
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 6: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
      InventoryInstance.verifyHoldingsAbsent(testData.location.name);
      InventoryInstance.checkAcquisitionsDetails([
        { polNumber: testData.secondOrderLine.poLineNumber },
      ]);
    },
  );
});
