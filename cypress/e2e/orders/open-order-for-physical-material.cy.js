import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Orders', () => {
  const organization = { ...newOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLineTitle = basicOrderLine.defaultOrderLine.titleOrPackage;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C734 Open order for physical material set to create Instance, Holding, Item (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'broken'] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        Orders.checkCreatedOrder(order);

        OrderLines.addPOLine();
        OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
        OrderLines.backToEditingOrder();
        Orders.openOrder();

        TopMenuNavigation.openAppFromDropdown('Inventory');
        InventorySearchAndFilter.searchByParameter('Title (all)', orderLineTitle);
        InventorySearchAndFilter.verifySearchResult(orderLineTitle);
      });
    },
  );
});
