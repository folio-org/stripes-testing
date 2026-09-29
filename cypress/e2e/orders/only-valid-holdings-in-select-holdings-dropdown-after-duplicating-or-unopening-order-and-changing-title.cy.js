import {
  APPLICATION_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import SelectInstanceModal from '../../support/fragments/orders/modals/selectInstanceModal';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
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
  let testData;

  const getOrderLine = ({ orderId, title, checkinItems, locations }) => ({
    ...BasicOrderLine.getDefaultOrderLine({
      title,
      purchaseOrderId: orderId,
      acquisitionMethod: testData.acquisitionMethod.id,
      checkinItems,
      quantity: locations.length,
    }),
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
      materialType: testData.materialType.id,
      materialSupplier: testData.organization.id,
      volumes: [],
    },
    locations: locations.map(({ id }) => ({ locationId: id, quantity: 1, quantityPhysical: 1 })),
  });

  const createOpenOrder = ({ title, checkinItems, locations }) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    ).then((order) => {
      OrderLines.createOrderLineViaApi(
        getOrderLine({ orderId: order.id, title, checkinItems, locations }),
      ).then((orderLine) => {
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
          testData.orders.push({ order, orderLine: openedOrderLine });
        });
      });
    });
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      firstInstanceTitle: `AT_C1292043_FolioInstance_1_${getRandomPostfix()}`,
      secondInstanceTitle: `AT_C1292043_FolioInstance_2_${getRandomPostfix()}`,
      firstOrderTitle: `AT_C1292043_FolioInstance_Order_1_${getRandomPostfix()}`,
      secondOrderTitle: `AT_C1292043_FolioInstance_Order_2_${getRandomPostfix()}`,
      updatedTitle: `AT_C1292043_UpdatedTitle_${getRandomPostfix()}`,
      orders: [],
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
    // "Loc 1" and "Loc 2" are used for Instance #1 holdings, "Loc 3" is different from them
    Locations.getViaApiAnyDefault(3).then((locations) => {
      [testData.firstLocation, testData.secondLocation, testData.thirdLocation] = locations;
    });

    // Precondition 1: Instance #1 with two holdings (Loc 1 and Loc 2)
    // Precondition 2: Instance #2 without holdings
    cy.then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.firstInstanceTitle,
            },
            holdings: [testData.firstLocation, testData.secondLocation].map(({ id }) => ({
              holdingsTypeId: holdingTypes[0].id,
              permanentLocationId: id,
            })),
          });
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.secondInstanceTitle,
            },
          });
        });
      });
    });

    // Precondition 3: Order #1 (Synchronized, Quantity = 2, Loc 1 and Loc 3, Instance, Holdings, Item)
    cy.then(() => {
      createOpenOrder({
        title: testData.firstOrderTitle,
        checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
        locations: [testData.firstLocation, testData.thirdLocation],
      });
    });

    // Precondition 4: Order #2 (Independent, Quantity = 1, Loc 1, Instance, Holdings, Item)
    cy.then(() => {
      createOpenOrder({
        title: testData.secondOrderTitle,
        checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
        locations: [testData.firstLocation],
      });
    });

    // Precondition 5: One piece has been added to the Title for the POL from the Order #2
    cy.then(() => {
      [testData.firstOrder, testData.secondOrder] = testData.orders;

      Receivings.addPieceViaApi({
        poLineId: testData.secondOrder.orderLine.id,
        poLineNumber: testData.secondOrder.orderLine.poLineNumber,
        format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
        holdingId: testData.secondOrder.orderLine.locations[0].holdingId,
      });
    });

    // Precondition 6: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 7: User is on "Orders" pane with the search result for the Order #1
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.firstOrder.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    // Delete original orders and the duplicated order (its POL title changes during the test)
    OrderLines.getOrderLineViaApi({
      query: `titleOrPackage==("${testData.firstOrderTitle}" or "${testData.secondOrderTitle}" or "${testData.firstInstanceTitle}" or "${testData.updatedTitle}")`,
    }).then((orderLines) => {
      [...new Set(orderLines.map(({ purchaseOrderId }) => purchaseOrderId))].forEach((orderId) => {
        Orders.deleteOrderViaApi(orderId, false);
      });
    });
    [
      testData.firstInstanceTitle,
      testData.secondInstanceTitle,
      testData.firstOrderTitle,
      testData.secondOrderTitle,
    ].forEach((title) => {
      InventoryInstances.deleteFullInstancesByTitleViaApi(title);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1292043 Only valid holdings for the selected instance are displayed in the "Select holdings" dropdown after duplicating or unopening an order and changing the title (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1292043'] },
    () => {
      // Step 1: Click "Actions" -> "Duplicate" and click "Duplicate" in the modal
      Orders.selectFromResultsList(testData.firstOrder.order.poNumber);
      Orders.duplicateOrder();
      InteractorsTools.checkCalloutMessage(OrderStates.orderDuplicatedSuccessfully);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.checkOrderDetails({
        orderInformation: [{ key: 'Vendor', value: testData.organization.name }],
      });
      OrderDetails.checkOrderLinesTableContent([{ poLineTitle: testData.firstOrderTitle }]);

      // Step 2: Click on the PO line record, click "Actions" -> "Edit"
      OrderDetails.openPolDetails(testData.firstOrderTitle);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkLocationsSection([
        { label: 'holding', index: 0, conditions: { singleValue: testData.firstLocation.name } },
        { label: 'holding', index: 1, conditions: { singleValue: testData.thirdLocation.name } },
      ]);

      // Step 3: Click "Title look-up" and select the Instance #1
      OrderLineEditForm.clickTitleLookUpButton();
      SelectInstanceModal.searchByName(testData.firstInstanceTitle);
      SelectInstanceModal.selectInstance();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.firstInstanceTitle } },
      ]);
      OrderLineEditForm.checkLocationsSectionIsEmpty();

      // Step 4: Click "Add location" and expand the "Select holdings" dropdown
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandHoldingsDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions([
        testData.firstLocation.name,
        testData.secondLocation.name,
      ]);

      // Step 5: Select any holding, enter 2 in "Quantity physical" and click "Save & close"
      OrderLineEditForm.selectLocationFromDropdown(testData.firstLocation.name);
      OrderLines.setPhysicalQuantity({ quantity: '2', changeQuantity: false });
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 2 },
          ],
        ],
      });

      // Step 6: Click "Actions" -> "Edit" and expand the "Select holdings" dropdown
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.expandHoldingsDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions([
        testData.firstLocation.name,
        testData.secondLocation.name,
      ]);

      // Step 7: Enter any value in the "Title" field and click "Confirm" in the "Remove instance connection" modal
      OrderLineEditForm.fillItemDetails({ title: testData.updatedTitle });
      OrderLines.removeInstanceConnectionModal();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.updatedTitle } },
      ]);
      OrderLineEditForm.checkLocationSelected({ location: '' });

      // Step 8: Expand the "Name (code)" dropdown
      OrderLineEditForm.expandLocationDropdown(0);
      // "Loc 3" is not related to the Instance #1 holdings, so it confirms that all locations are available
      OrderLineEditForm.checkLocationDropdownOptions(
        [testData.firstLocation, testData.secondLocation, testData.thirdLocation].map(
          ({ name, code }) => `${name} (${code})`,
        ),
        { exactMatch: false },
      );

      // Step 9: Select any location and click "Save & close"
      OrderLineEditForm.selectLocationFromDropdown(
        `${testData.thirdLocation.name} (${testData.thirdLocation.code})`,
      );
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.thirdLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 2 },
          ],
        ],
      });

      // Step 10: Navigate to the Order #2, click "Actions" -> "Unopen" and click "Submit"
      // Order #2 holding has a related piece, so no "Delete Holdings" options are expected in the modal
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.secondOrder.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: testData.secondOrder.order.poNumber,
        hasRelations: false,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.secondOrder.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 11: Click on the PO line record, click "Actions" -> "Edit"
      OrderDetails.openPolDetails(testData.secondOrderTitle);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkLocationsSection([
        { label: 'holding', conditions: { singleValue: testData.firstLocation.name } },
      ]);

      // Step 12: Click "Title look-up" and select the Instance #2
      OrderLineEditForm.clickTitleLookUpButton();
      SelectInstanceModal.searchByName(testData.secondInstanceTitle);
      SelectInstanceModal.selectInstance();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.secondInstanceTitle } },
      ]);
      OrderLineEditForm.checkLocationsSectionIsEmpty();

      // Step 13: Click "Add location" and expand the "Select holdings" dropdown
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandHoldingsDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions(['--']);

      // Step 14: Click "Create new holdings for location", select any location, enter 1 in "Quantity physical" and save
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.selectLocation(testData.thirdLocation.name);
      OrderLines.setPhysicalQuantity({ quantity: '1', changeQuantity: false });
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.thirdLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 1 },
          ],
        ],
      });

      // Step 15: Click "Actions" -> "Edit", click "x" icon in the "Name (code)" dropdown and expand the "Select holdings" dropdown
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.clearLocationSelection(0);
      OrderLineEditForm.expandHoldingsDropdown(0);
      OrderLineEditForm.checkLocationDropdownOptions(['--']);
    },
  );
});
