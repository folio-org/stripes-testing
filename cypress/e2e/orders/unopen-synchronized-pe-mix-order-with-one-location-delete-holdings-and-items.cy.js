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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 2;
  const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED];
  let testData;

  const openOrderFromInventory = () => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
    Orders.resetFiltersIfActive();
    Orders.selectOrderByPONumber(testData.order.poNumber);
    OrderDetails.waitLoading();
  };

  const openInstanceFromPol = () => {
    OrderLines.selectPOLInOrder(0);
    OrderLineDetails.waitLoading();
    OrderLineDetails.openInventoryItem();
    InventoryInstance.checkInstanceTitle(testData.instanceTitle);
  };

  const unopenOrder = ({ keepHoldings }) => {
    OrderDetails.unOpenOrder({
      orderNumber: testData.order.poNumber,
      checkinItems,
      confirm: false,
    });
    UnopenConfirmationModal.confirm({ keepHoldings });
    InteractorsTools.checkCalloutMessage(
      OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
    );
    OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C1250445_FolioInstance_${getRandomPostfix()}`,
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

    // Precondition 1: Open order with one P/E mix POL (Synchronized workflow, one location with 2 physical and 2 electronic)
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
          }),
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPrice: 10,
            listUnitPriceElectronic: 10,
            quantityPhysical: QUANTITY,
            quantityElectronic: QUANTITY,
          },
          locations: [
            {
              locationId: testData.location.id,
              quantityPhysical: QUANTITY,
              quantityElectronic: QUANTITY,
            },
          ],
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

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          testData.orderLine = createdOrderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 2: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 3: User is on "Orders" pane with the details pane open for the created order
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
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1250445 Unopen a synchronized P/E mix order with one location for physical and electronic resources (Delete holdings and items) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1250445'] },
    () => {
      // Step 1: Click "Actions" -> "Unopen" and click "Delete holdings and items" button
      unopenOrder({ keepHoldings: false });

      // Step 2: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: QUANTITY },
          ],
        ],
      });

      // Step 3: Click on the title name link in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAbsent(testData.location.name);

      // Step 4: Navigate back to the order, click "Actions" -> "Open" and click "Submit"
      openOrderFromInventory();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 5: Click on the PO line record and click on the title name link in the "Item details" accordion
      openInstanceFromPol();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: QUANTITY });

      // Step 6: Navigate back to the order, click "Actions" -> "Unopen" and click "Delete items" button
      openOrderFromInventory();
      unopenOrder({ keepHoldings: true });

      // Step 7: Click on the PO line record and click on the title name link in the "Item details" accordion
      openInstanceFromPol();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
    },
  );
});
