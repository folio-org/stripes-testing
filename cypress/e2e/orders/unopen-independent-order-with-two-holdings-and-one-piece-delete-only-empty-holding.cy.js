import {
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
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT];
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C1273160_FolioInstance_${getRandomPostfix()}`,
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
    // "Loc 1" has a related piece, "Loc 2" has no pieces
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.firstLocation, testData.secondLocation] = locations;
    });

    // Precondition 1: Open order with one POL (Independent workflow, Quantity = 2, Loc 1 and Loc 2, Instance, Holdings)
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
            quantity: QUANTITY * 2,
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
              locationId: testData.firstLocation.id,
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
            {
              locationId: testData.secondLocation.id,
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

    // Precondition 2: One piece has been added to the related Title to the holding from POL (Loc 1)
    cy.then(() => {
      cy.getHoldings({ query: `"instanceId"=="${testData.orderLine.instanceId}"` }).then(
        (holdings) => {
          const firstLocationHolding = holdings.find(
            ({ permanentLocationId }) => permanentLocationId === testData.firstLocation.id,
          );

          Receivings.addPieceViaApi({
            poLineId: testData.orderLine.id,
            poLineNumber: testData.orderLine.poLineNumber,
            format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            holdingId: firstLocationHolding.id,
          });
        },
      );
    });

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" pane with the search result for the order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1273160 Unopen an order with independent receiving workflow with two holdings and only one related piece (Delete only empty holding) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1273160'] },
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

      // Step 3: Click on the PO line record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.instanceTitle);
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

      // Step 4: Click on the "Title name" link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name, count: 0 });
      InventoryInstance.verifyHoldingsAbsent(testData.secondLocation.name);
      InventoryInstance.checkAcquisitionsDetails([{ polNumber: testData.orderLine.poLineNumber }]);
    },
  );
});
