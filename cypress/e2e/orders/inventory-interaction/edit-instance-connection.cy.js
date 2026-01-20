import { ORDER_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryHoldings, InventoryInstances } from '../../../support/fragments/inventory';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      organization: NewOrganization.getDefaultOrganization(),
      materialType: {},
      location: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        cy.getDefaultMaterialType().then((mt) => {
          testData.materialType = mt;
        });
        ServicePoints.createViaApi(testData.servicePoint);
        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;
        Locations.createViaApi(testData.location);
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: testData.location,
        });
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            createInventory: 'Instance, Holding',
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.inventoryCRUDHoldings.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
        InventoryInstances.deleteInstanceViaApi({
          instance: testData.folioInstances[0],
          shouldDeleteItems: false,
          shouldDeleteHoldings: false,
        });
        Locations.deleteViaApi(testData.location);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353576 Edit instance connection of POL - create inventory set to "Instance, holding" (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353576'] },
      () => {
        // Click on the Order
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click PO Line record in "PO Lines" accordion
        const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: 'Title', value: testData.orderLine.titleOrPackage }],
          physicalResourceDetails: [{ key: 'Create inventory', value: 'Instance, Holding' }],
          linkedInstances: [{ title: testData.orderLine.titleOrPackage }],
        });

        // Click "Actions" button on PO line details pane
        OrderLineDetails.expandActionsDropdown();
        OrderLineDetails.checActionsMenuContent([
          'Edit',
          'Change instance connection',
          'Print order line',
          'Print order',
        ]);

        // Select "Change Instance connection" option from Actions drop-down menu
        const SelectInstanceModal = OrderLineDetails.changeInstanceConnection({ expand: false });

        // Select Title #1 from "Precondition item #2" and click on it
        SelectInstanceModal.searchByName(testData.folioInstances[0].instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Choose "Move" option from dropdown and click "Submit" button
        ChangeInstanceModal.selectHoldingOperation({ operation: 'Move' });
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: 'Title', value: testData.folioInstances[0].instanceTitle }],
          linkedInstances: [{ title: testData.folioInstances[0].instanceTitle }],
        });

        // Click on "Title" link in "Item details" accordion" on "PO Line details" pane
        const InventoryInstance = OrderLineDetails.openInventoryItem();
        cy.wait(3000);
        InventoryInstance.checkInstanceTitle(testData.folioInstances[0].instanceTitle);
        InventoryInstance.checkHoldingTitle({ title: testData.location.name });
        InventoryInstance.checkAcquisitionsDetails([
          {
            polNumber: `${testData.order.poNumber}-1`,
            orderStatus: 'Open',
            receiptStatus: 'Ongoing',
          },
        ]);

        // Go to "Inventory" app, search for "PO Line Title value" from precondition item #3.2 and click on it
        InventoryInstances.searchByTitle(testData.orderLine.titleOrPackage);
        InventoryInstances.selectInstance();
        InventoryInstance.checkHoldingTitle({
          title: testData.orderLine.titleOrPackage,
          absent: true,
        });
      },
    );
  });
});
