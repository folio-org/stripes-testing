import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    servicePoint: ServicePoints.getDefaultServicePoint(),
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);

      ServicePoints.createViaApi(testData.servicePoint)
        .then(() => {
          testData.locations = [
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
            Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id }).location,
          ];
          testData.locations.forEach((location) => Locations.createViaApi(location));
        })
        .then(() => {
          cy.getMaterialTypes({ limit: 1 }).then(({ id: materialTypeId }) => {
            testData.orderLine = {
              ...BasicOrderLine.getDefaultOrderLine(),
              cost: {
                listUnitPriceElectronic: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityElectronic: 2,
              },
              orderFormat: 'Electronic Resource',
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
              eresource: {
                activated: false,
                createInventory: 'Instance, Holding, Item',
                trial: false,
                accessProvider: testData.organization.id,
                materialType: materialTypeId,
              },
              locations: [
                { locationId: testData.locations[0].id, quantity: 1, quantityElectronic: 1 },
                { locationId: testData.locations[1].id, quantity: 1, quantityElectronic: 1 },
              ],
            };

            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
              testData.orderLine,
            ).then((order) => {
              testData.order = order;
            });
          });
        });
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
    testData.locations.forEach((location) => {
      InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(location.id);
      Locations.deleteViaApi(location);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C402353 Holdings records creation when open order with "Electronic Resource" format PO line and Independent workflow (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      // Open Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click "Actions" button, Select "Open" option, Click "Submit" button
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Holding', value: testData.locations[0].name },
            { key: 'Quantity electronic', value: 1 },
          ],
          [
            { key: 'Holding', value: testData.locations[1].name },
            { key: 'Quantity electronic', value: 1 },
          ],
        ],
      });

      // Click on "Title" link in "Item details" accordion
      const InventoryInstance = OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle({ title: testData.locations[0].name });
      InventoryInstance.checkHoldingTitle({ title: testData.locations[1].name });
    },
  );
});
