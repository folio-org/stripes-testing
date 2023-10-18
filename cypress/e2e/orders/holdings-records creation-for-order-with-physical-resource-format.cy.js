import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { NewOrder, BasicOrderLine, Orders } from '../../support/fragments/orders';
import { RECEIVING_WORKFLOWS } from '../../support/fragments/orders/basicOrderLine';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Orders', () => {
  const checkinItems = {
    [RECEIVING_WORKFLOWS.SYNCHRONIZED]: false,
    [RECEIVING_WORKFLOWS.INDEPENDENT]: true,
  };
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
                listUnitPrice: 10,
                currency: 'USD',
                discountType: 'percentage',
                quantityPhysical: 2,
              },
              orderFormat: 'Physical Resource',
              checkinItems: checkinItems[RECEIVING_WORKFLOWS.INDEPENDENT],
              physical: {
                createInventory: 'Instance, Holding, Item',
                materialType: materialTypeId,
              },
              locations: [
                { locationId: testData.locations[0].id, quantityPhysical: 1 },
                { locationId: testData.locations[1].id, quantityPhysical: 1 },
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
    'C402352 Holdings records creation when open order with "Physical Resource" format PO line and Independent workflow (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
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
            { key: 'Quantity physical', value: 1 },
          ],
          [
            { key: 'Holding', value: testData.locations[1].name },
            { key: 'Quantity physical', value: 1 },
          ],
        ],
      });

      // Click on "Title" link in "Item details" accordion
      const InventoryInstance = OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingTitle(testData.locations[0].name);
      InventoryInstance.checkHoldingTitle(testData.locations[1].name);
    },
  );
});
