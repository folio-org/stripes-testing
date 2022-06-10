import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import OrderLines from '../../support/fragments/orders/orderLines';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: create an order', () => {
  const organization = { ...newOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOrder };
  const orderLineTitle = `Autotest Tetle_${getRandomPostfix()}`;

  before(() => {
    cy.getAdminToken();
    cy.createOrganizationApi(organization);
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.visit(TopMenu.ordersPath);
  });

  after(() => {
    cy.getOrdersApi()
      .then(body => {
        cy.deleteOrderApi(body.id);
      });
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C734 Open order for physical material set to create Instance, Holding, Item', { tags: [TestType.smoke] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);

    OrderLines.addPOLine();
    OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
    OrderLines.backToEditingOrder();
    Orders.openOrder();

    cy.visit(TopMenu.inventoryPath);
    InventorySearch.instanceSearch('Title (all)', orderLineTitle);
    InventorySearch.verifySearchResult(orderLineTitle);
  });
});
