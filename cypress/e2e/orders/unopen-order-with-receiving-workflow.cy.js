import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine, { RECEIVING_WORKFLOWS } from '../../support/fragments/orders/basicOrderLine';
import UnopenConfirmationModal from '../../support/fragments/orders/modals/unopenConfirmationModal';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';

describe('Orders', () => {
  const testData = {
    organization: {},
    servicePoint: {},
    instance: {},
    location: {},
    order: {},
    user: {},
  };

  const createOrder = ({ workflow }) => {
    testData.organization = NewOrganization.getDefaultOrganization({ accounts: 1 });
    testData.servicePoint = ServicePoints.getDefaultServicePoint();

    cy.getAdminToken()
      .then(() => {
        const checkinItems = {
          [RECEIVING_WORKFLOWS.SYNCHRONIZED]: false,
          [RECEIVING_WORKFLOWS.INDEPENDENT]: true,
        };
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = {
            ...instanceData,
            quantity: '2',
            checkinItems: checkinItems[workflow],
            vendorAccount: testData.organization.accounts[0].accountNo,
          };
          Organizations.createOrganizationViaApi(testData.organization);
        });
      })
      .then(() => {
        ServicePoints.createViaApi(testData.servicePoint).then(() => {
          Locations.createViaApi(
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }),
          ).then((location) => {
            testData.location = location;

            // create the first PO with POL
            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              BasicOrderLine.getDefaultOrderLine({
                quantity: testData.instance.quantity,
                title: testData.instance.instanceTitle,
                instanceId: testData.instance.instanceId,
                checkinItems: testData.instance.checkinItems,
                specialLocationId: testData.location.id,
                vendorAccount: testData.instance.vendorAccount,
              }),
            ).then((order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            });
          });
        });
      });
  };

  afterEach('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryHoldings.deleteHoldingRecordByInstanceIdViaApi(testData.instance.instanceId);
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  describe(RECEIVING_WORKFLOWS.SYNCHRONIZED, () => {
    beforeEach('Create test data', () => {
      createOrder({ workflow: RECEIVING_WORKFLOWS.SYNCHRONIZED });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersUnopenpurchaseorders.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    it(
      'C377037 Select "Delete Holdings and items" option when unopening an order with receiving workflow of "Synchronized order and receipt quantity" (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Keep Holdings" button
        UnopenConfirmationModal.confirm({ keepHoldings: false });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Click on PO line record in "PO lines" accordion
        OrderLines.selectPOLInOrder();
        OrderLines.openInstance();
        InventoryInstance.verifyInstanceTitle(testData.instance.instanceTitle);
      },
    );

    it(
      'C377040 Select "Delete items" option when unopening an order with receiving workflow of "Synchronized order and receipt quantity" (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click on PO line record in "PO lines" accordion
        OrderLines.selectPOLInOrder();

        // Click "Actions" button, Select "Edit" option
        OrderLines.editPOLInOrder();

        // Change "Receipt status" to "Receipt not required" in "PO line details" accordion
        OrderLines.fillPOLineDetails({ receiptStatus: 'Receipt not required' });

        // Click "Save & close" button
        OrderLines.saveOrderLine();

        // Click back arrow button on the top left
        OrderLines.backToEditingOrder();

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Cancel" button
        UnopenConfirmationModal.closeModal();

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Delete items" button
        UnopenConfirmationModal.confirm({ keepHoldings: true });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Click on PO line record in "PO lines" accordion
        OrderLines.selectPOLInOrder();
        OrderLines.openInstance();
        InventoryInstance.verifyInstanceTitle(testData.instance.instanceTitle);
      },
    );
  });

  describe(RECEIVING_WORKFLOWS.INDEPENDENT, () => {
    beforeEach('Create test data', () => {
      createOrder({ workflow: RECEIVING_WORKFLOWS.INDEPENDENT });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersUnopenpurchaseorders.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    it(
      'C377041 Select "Keep Holdings" option when unopening an order with receiving workflow of "Independent order and receipt quantity" (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Cancel" button
        UnopenConfirmationModal.closeModal();

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Keep Holdings" button
        UnopenConfirmationModal.confirm({ keepHoldings: true });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Click on PO line record in "PO lines" accordion
        OrderLines.selectPOLInOrder();
        OrderLines.openInstance();
        InventoryInstance.verifyInstanceTitle(testData.instance.instanceTitle);
      },
    );

    it(
      'C377042 Select "Delete Holdings" option when unopening an order with receiving workflow of "Independent order and receipt quantity" (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions" button, Select "Unopen" option
        OrderDetails.unOpenOrder({
          orderNumber: testData.order.poNumber,
          checkinItems: testData.instance.checkinItems,
          confirm: false,
        });

        // Click "Delete Holdings" button
        UnopenConfirmationModal.confirm({ keepHoldings: false });
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        // Click on PO line record in "PO lines" accordion
        OrderLines.selectPOLInOrder();
        OrderLines.openInstance();
        InventoryInstance.verifyInstanceTitle(testData.instance.instanceTitle);
      },
    );
  });
});
