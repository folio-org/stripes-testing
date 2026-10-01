import {
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C404365_Vendor_${randomPostfix}`,
    },
    servicePoint: ServicePoints.getDefaultServicePoint(),
    user: {},
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken().then(() => {
      // Precondition #1: Active "Vendor" organization
      Organizations.createOrganizationViaApi(testData.organization);

      ServicePoints.createViaApi(testData.servicePoint)
        .then(() => {
          // "Loc 1", "Loc 2" used in preconditions, "Loc 3" is selected in Step 11
          testData.locations = [
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
          ];
          testData.locations.forEach((location) => Locations.createViaApi(location));
        })
        .then(() => {
          cy.getDefaultMaterialType().then(({ id: materialTypeId }) => {
            // Precondition #2: PO line settings
            testData.orderLine = {
              ...BasicOrderLine.getDefaultOrderLine(),
              titleOrPackage: `AT_C404365_PolTitle_${randomPostfix}`,
              cost: {
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 1,
                quantityElectronic: 1,
                listUnitPriceElectronic: 10,
                listUnitPrice: 10,
              },
              orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
              eresource: {
                createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
                accessProvider: testData.organization.id,
              },
              physical: {
                createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                materialType: materialTypeId,
              },
              locations: [
                {
                  locationId: testData.locations[0].id,
                  quantityPhysical: 1,
                  quantityElectronic: 0,
                },
                {
                  locationId: testData.locations[1].id,
                  quantityPhysical: 0,
                  quantityElectronic: 1,
                },
              ],
            };

            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              testData.orderLine,
            ).then((order) => {
              testData.order = order;

              // Order should be in "Open" status
              Orders.updateOrderViaApi({
                ...testData.order,
                workflowStatus: ORDER_STATUSES.OPEN,
              });
            });
          });
        });
    });

    // Precondition #3: Authorized user with required permissions
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition #4: A user is on "Orders" pane with search results for Order
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    testData.locations.forEach((location) => {
      InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(location.id);
      Locations.deleteViaApi(location);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C404365 Editing location in open order with "P/E mix" format PO line and Independent workflow, "Create inventory" in "E-resources details" = Instance (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C404365'] },
    () => {
      // Step 1: Open Order from "Preconditions #2" details pane
      Orders.resetFiltersIfActive();
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.locations[0].name },
            { key: 'Quantity physical', value: 1 },
          ],
          [
            { key: 'Name (code)', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });

      // Step 3: Click "Actions" button => select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 4: Click "Trash" icon next to the first record (Loc 1)
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 5: Add "1" to "Quantity physical" for remaining location (Loc 2) => "Save & close"
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Name (code)', value: testData.locations[1].name },
            { key: 'Quantity physical', value: 1 },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });
      // Deleted location (Loc 1) is no longer displayed in "Location" accordion
      OrderLineDetails.verifyLocationAbsentInSection(testData.locations[0].name);

      // Step 6: Click "Title" link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, absent: true });

      // Step 7: Unopen order => "Submit" button in confirmation popup
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        hasRelations: false,
        submit: true,
      });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 8: Open order => "Submit" button in confirmation popup
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 9: Click PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      // Same holding name (Loc 2) is displayed both for physical and electronic items
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.locations[1].name },
            { key: 'Quantity physical', value: 1 },
          ],
          [
            { key: 'Name (code)', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });
      OrderLineDetails.verifyLocationAbsentInSection(testData.locations[0].name);

      // Step 10: Click "Title" link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name, count: 0 });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, count: 0 });

      // Step 11: Open POL from "Acquisitions" accordion => Edit => replace physical holding with Loc 3
      InventoryInstance.openPolFromAcquisitionsAccordion();
      OrderLineDetails.waitLoading();
      OrderLineDetails.openOrderLineEditForm();
      // Delete existing physical holding (Loc 2)
      OrderLineEditForm.removeLocationByIndex(0);
      const SelectLocationModal = OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.selectLocation(testData.locations[2].name);
      // Add "1" physical quantity to newly created line
      OrderLineEditForm.fillLocationDetails([{}, { quantityPhysical: '1' }]);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Name (code)', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
          [
            // Holding is not created for newly added location until the order is reopened
            { key: 'Name (code)', value: testData.locations[2].name },
            { key: 'Quantity physical', value: 1 },
          ],
        ],
      });
      // Replaced physical holding (Loc 1) is not displayed in "Location" accordion
      OrderLineDetails.verifyLocationAbsentInSection(testData.locations[0].name);

      // Step 12: Click "Title" link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name, count: 0 });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, count: 0 });

      // Step 13: Unopen order => "Submit" button in confirmation popup
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      // "PO lines" pane is opened after navigating to POL from "Inventory" app in Step 11
      Orders.selectOrdersPane();
      Orders.resetFiltersIfActive();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        hasRelations: false,
        submit: true,
      });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 14: Open order => "Submit" button in confirmation popup
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 15: Click PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Name (code)', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
          [
            { key: 'Holding', value: testData.locations[2].name },
            { key: 'Quantity physical', value: 1 },
          ],
        ],
      });

      // Step 16: Click "Title" link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name, count: 0 });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name, count: 0 });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[2].name, count: 0 });
    },
  );
});
