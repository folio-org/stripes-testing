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
  const synchronizedCheckinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  let testData;

  const openOrderFromInventory = () => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
    Orders.resetFiltersIfActive();
    Orders.selectOrderByPONumber(testData.order.poNumber);
    OrderDetails.waitLoading();
  };

  const unopenOrder = ({ keepHoldings }) => {
    OrderDetails.unOpenOrder({
      orderNumber: testData.order.poNumber,
      checkinItems: synchronizedCheckinItems,
      confirm: false,
    });
    UnopenConfirmationModal.confirm({ keepHoldings });
    InteractorsTools.checkCalloutMessage(
      OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
    );
    OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
  };

  const checkHoldingsItemsCount = (itemsCountByLocation) => {
    InventoryInstance.verifyHoldingsAccordionsCount(testData.locations.length);
    testData.locations.forEach((location, index) => {
      InventoryInstance.checkHoldingTitle({
        title: location.name,
        count: itemsCountByLocation[index],
      });
    });
  };

  const getPeMixOrderLine = ({ orderId, title, checkinItems, polLocations }) => {
    const sumQuantity = (key) => polLocations.reduce((sum, location) => sum + (location[key] || 0), 0);

    return {
      ...BasicOrderLine.getDefaultOrderLine({
        title,
        purchaseOrderId: orderId,
        acquisitionMethod: testData.acquisitionMethod.id,
        checkinItems,
      }),
      orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
      cost: {
        currency: 'USD',
        discountType: 'percentage',
        listUnitPrice: 10,
        listUnitPriceElectronic: 10,
        quantityPhysical: sumQuantity('quantityPhysical'),
        quantityElectronic: sumQuantity('quantityElectronic'),
      },
      locations: polLocations.map(({ location, quantityPhysical, quantityElectronic }) => ({
        locationId: location.id,
        ...(quantityPhysical && { quantityPhysical }),
        ...(quantityElectronic && { quantityElectronic }),
      })),
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: testData.materialType.id,
        materialSupplier: testData.organization.id,
        volumes: [],
      },
      eresource: {
        activated: false,
        trial: false,
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
        materialType: testData.materialType.id,
        accessProvider: testData.organization.id,
      },
    };
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      firstInstanceTitle: `AT_C1250447_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1250447_FolioInstance_2_${getRandomPostfix()}`,
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
    Locations.getViaApiAnyDefault(3).then((locations) => {
      testData.locations = locations;
    });

    // Precondition 2: Open order with two P/E mix POLs (Independent and Synchronized workflows)
    cy.then(() => {
      const [location1, location2, location3] = testData.locations;

      // PO line #1: Independent workflow, Loc 1 - 2 physical, Loc 2 - 1 physical, Loc 3 - 2 electronic
      testData.firstPolLocations = [
        { location: location1, quantityPhysical: 2 },
        { location: location2, quantityPhysical: 1 },
        { location: location3, quantityElectronic: 2 },
      ];
      // PO line #2: Synchronized workflow, Loc 1 - 2 physical, Loc 2 - 3 electronic, Loc 3 - 1 electronic
      testData.secondPolLocations = [
        { location: location1, quantityPhysical: 2 },
        { location: location2, quantityElectronic: 3 },
        { location: location3, quantityElectronic: 1 },
      ];

      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          getPeMixOrderLine({
            orderId: order.id,
            title: testData.firstInstanceTitle,
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
            polLocations: testData.firstPolLocations,
          }),
        );
        OrderLines.createOrderLineViaApi(
          getPeMixOrderLine({
            orderId: order.id,
            title: testData.secondInstanceTitle,
            checkinItems: synchronizedCheckinItems,
            polLocations: testData.secondPolLocations,
          }),
        ).then(() => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" pane with the details pane open for the created order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();
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
    'C1250447 Unopen a P/E mix order with two po lines with different receiving workflows (Delete holdings and items) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1250447', 'nonParallel'] },
    () => {
      const [location1, location2, location3] = testData.locations;

      // Step 1: Click "Actions" -> "Unopen" and click "Delete holdings and items" button
      unopenOrder({ keepHoldings: false });

      // Step 2: Click on the PO line #1 record in the "PO lines" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 2 },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 1 },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location3.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: 2 },
          ],
        ],
      });

      // Step 3: Click on the title name link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
      [location1, location2, location3].forEach((location) => {
        InventoryInstance.verifyHoldingsAbsent(location.name);
      });

      // Step 4: Navigate back to the order and click on the PO line #2 record in the "PO lines" accordion
      openOrderFromInventory();
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 2 },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: 3 },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: location3.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: 1 },
          ],
        ],
      });

      // Step 5: Click on the title name link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
      [location1, location2, location3].forEach((location) => {
        InventoryInstance.verifyHoldingsAbsent(location.name);
      });

      // Step 6: Navigate back to the order, click "Actions" -> "Open" and click "Submit"
      openOrderFromInventory();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 7: Click on the PO line #1 record and click on the title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      checkHoldingsItemsCount([0, 0, 0]);

      // Step 8: Navigate back to the order, click on the PO line #2 record and click on the title name link
      openOrderFromInventory();
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      checkHoldingsItemsCount([2, 0, 0]);

      // Step 9: Navigate back to the order, click "Actions" -> "Unopen" and click "Delete items" button
      openOrderFromInventory();
      unopenOrder({ keepHoldings: true });

      // Step 10: Click on the PO line #1 record and click on the title name link in the "Item details" accordion
      OrderDetails.openPolDetails(testData.firstInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.firstInstanceTitle);
      checkHoldingsItemsCount([0, 0, 0]);

      // Step 11: Navigate back to the order, click on the PO line #2 record and click on the title name link
      openOrderFromInventory();
      OrderDetails.openPolDetails(testData.secondInstanceTitle);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.secondInstanceTitle);
      checkHoldingsItemsCount([0, 0, 0]);
    },
  );
});
