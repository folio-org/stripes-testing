import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe(
  'orders: Receive piece from Order',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    let order;
    let organization;
    let orderLineUI;
    let user;
    let orderNumber;
    let firstLocation;
    let secondLocation;
    const displaySummary = 'autotestCaption';

    beforeEach(() => {
      order = { ...NewOrder.defaultOneTimeOrder, approved: true };
      organization = { ...NewOrganization.defaultUiOrganizations };

      cy.getAdminToken();

      InventoryInstances.getLocations({ limit: 2 }).then((res) => {
        [firstLocation, secondLocation] = res;

        cy.getDefaultMaterialType().then((mtype) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((params) => {
            // Prepare 2 Open Orders for Rollover
            Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
              organization.id = responseOrganizations;
              order.vendor = organization.id;
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                id: uuid(),
                cost: {
                  listUnitPrice: 200.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 200.0,
                },
                fundDistribution: [],
                locations: [{ locationId: firstLocation.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: params.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtype.id,
                  materialSupplier: responseOrganizations,
                  volumes: [],
                },
              };
              Orders.createOrderViaApi(order).then((orderResponse) => {
                order.id = orderResponse.id;
                orderNumber = orderResponse.poNumber;
                orderLine.purchaseOrderId = orderResponse.id;
                orderLineUI = orderLine;
                OrderLines.createOrderLineViaApi(orderLine);
                Orders.updateOrderViaApi({
                  ...orderResponse,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        permissions.uiOrdersView.gui,
        permissions.uiOrdersEdit.gui,
        permissions.uiInventoryViewInstances.gui,
        permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });

    afterEach(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C9177 Change location during receiving (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C9177', 'shiftLeft'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        // Receiving part
        Orders.receiveOrderViaActions();
        Receiving.selectFromResultsList(orderLineUI.titleOrPackage);
        Receiving.receiveAndChangeLocation(0, displaySummary, secondLocation.name);

        Receiving.checkReceived(0, displaySummary);
        Receiving.selectInstanceInReceive();
        InventoryInstance.checkInstanceTitle(orderLineUI.titleOrPackage);
        InventoryInstance.openHoldingsAccordion(secondLocation.name);
        InventoryInstance.openItemByBarcodeAndIndex('No barcode');
      },
    );
  },
);
