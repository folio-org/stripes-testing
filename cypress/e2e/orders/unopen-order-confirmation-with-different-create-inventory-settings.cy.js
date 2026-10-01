import {
  APPLICATION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import UnopenConfirmationModal from '../../support/fragments/orders/modals/unopenConfirmationModal';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
    location: {},
    materialTypeId: '',
    acquisitionMethodId: '',
    orders: [
      { isOngoing: true, createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM },
      { isOngoing: false, createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING },
      { isOngoing: false, createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE },
      { isOngoing: false, createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE },
    ],
    user: {},
  };

  const createOpenOrder = (orderData) => {
    let order;

    if (orderData.isOngoing) {
      order = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        approved: true,
      };
    } else {
      order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
    }

    return Orders.createOrderViaApi(order).then((createdOrder) => {
      orderData.order = createdOrder;

      OrderLines.createOrderLineViaApi(
        BasicOrderLine.getDefaultOrderLine({
          title: `AT_C449376_FolioInstance_${getRandomPostfix()}`,
          acquisitionMethod: testData.acquisitionMethodId,
          purchaseOrderId: createdOrder.id,
          createInventory: orderData.createInventory,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialTypeId,
          vendorAccount: testData.organization.accounts[0].accountNo,
        }),
      ).then((orderLine) => {
        orderData.orderLine = orderLine;

        Orders.updateOrderViaApi({ ...createdOrder, workflowStatus: ORDER_STATUSES.OPEN });
        OrderLines.getOrderLineByIdViaApi(orderLine.id).then(({ instanceId }) => {
          orderData.instanceId = instanceId;
        });
      });
    });
  };

  const openOrderFromSearch = (poNumber) => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
    Orders.waitLoading();
    Orders.selectOrderByPONumber(poNumber);
    OrderDetails.waitLoading();
  };

  const checkOrderUnopened = (poNumber) => {
    InteractorsTools.checkCalloutMessage(OrderStates.orderUnopenedSuccessfully(poNumber));
    OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken()
      .then(() => {
        Organizations.createOrganizationViaApi(testData.organization);
        MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
          testData.materialTypeId = mtypes[0].id;
        });
        cy.getAcquisitionMethodsApi().then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
        });
        Locations.getViaApiAnyDefault().then((locations) => {
          testData.location = locations[0];
        });
      })
      .then(() => {
        testData.orders.forEach((orderData) => createOpenOrder(orderData));
      })
      .then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersUnopenpurchaseorders.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    testData.orders.forEach(({ order, instanceId }) => {
      Orders.deleteOrderViaApi(order.id, false);

      if (instanceId) {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      }
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C449376 Confirmation message appears when user tries to unopen order with different "Create inventory" settings (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C449376'] },
    () => {
      const [order1, order2, order3, order4] = testData.orders;

      // Step 1: Click on Order number from precondition #1
      Orders.selectOrderByPONumber(order1.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click on "Actions" -> select "Unopen" option
      OrderDetails.unOpenOrder({
        orderNumber: order1.order.poNumber,
        checkinItems: false,
        confirm: false,
      });

      // Step 3: Click on "Delete items" button
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      checkOrderUnopened(order1.order.poNumber);

      // Step 4: Click on PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(order1.orderLine.titleOrPackage);
      OrderLineDetails.checkPoLineInformationSection([
        { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.PENDING },
        { key: POLINE_DETAILS_FIELDS.PAYMENT_STATUS, value: ORDER_LINE_PAYMENT_STATUS.PENDING },
      ]);

      // Step 5: Click on "Title" hyperlink
      OrderLineDetails.openInventoryItem();
      InventoryInstance.verifyInstanceTitle(order1.orderLine.titleOrPackage);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 0);

      // Step 6: Navigate back to "Orders" app, open Order #2, click "Actions" -> "Unopen"
      openOrderFromSearch(order2.order.poNumber);
      OrderDetails.unOpenOrder({ confirm: false });

      // Step 7: Click on "Keep holdings" button
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      checkOrderUnopened(order2.order.poNumber);

      // Step 8: Click on PO line record in "PO lines" accordion, click on "Title" hyperlink
      OrderDetails.openPolDetails(order2.orderLine.titleOrPackage);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.verifyInstanceTitle(order2.orderLine.titleOrPackage);
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 0);

      // Step 9: Navigate back to "Orders" app, open Order #3, click "Actions" -> "Unopen"
      openOrderFromSearch(order3.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: order3.order.poNumber,
        hasRelations: false,
        confirm: false,
      });

      // Step 10: Click on "Submit" button
      UnopenConfirmationModal.confirm({ submit: true });
      checkOrderUnopened(order3.order.poNumber);

      // Step 11: Click on PO line record in "PO lines" accordion, click on "Title" hyperlink
      OrderDetails.openPolDetails(order3.orderLine.titleOrPackage);
      OrderLineDetails.openInventoryItem();
      InventoryInstance.verifyInstanceTitle(order3.orderLine.titleOrPackage);
      InventoryInstance.verifyHoldingsAbsent();

      // Step 12: Navigate back to "Orders" app, open Order #4, click "Actions" -> "Unopen"
      openOrderFromSearch(order4.order.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: order4.order.poNumber,
        hasRelations: false,
        confirm: false,
      });

      // Step 13: Click on "Submit" button
      UnopenConfirmationModal.confirm({ submit: true });
      checkOrderUnopened(order4.order.poNumber);

      // Step 14: Click on PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(order4.orderLine.titleOrPackage);
      OrderLineDetails.checkTitleIsNotLink(order4.orderLine.titleOrPackage);

      // Step 15: Scroll down to "Linked instance" accordion and expand it
      OrderLineDetails.checkLinkedInstancesTableContent();
    },
  );
});
