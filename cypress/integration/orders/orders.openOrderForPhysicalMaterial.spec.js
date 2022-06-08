import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import OrderLines from '../../support/fragments/orders/orderLines';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOrder };
  const orderLineTitle = `Autotest Tetle_${getRandomPostfix()}`;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    order.vendor = 'Amazon.com';
    order.orderType = 'One-time';
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    cy.visit(TopMenu.ordersPath);
    Orders.selectOpenStatusFilter();
    Orders.selectFromResultsList();
    OrderLines.selectPOLInOrder();
    OrderLines.deleteOrderLine();
    Orders.deleteOrderViaActions();
  });

  it('C734 Open order for physical material set to create Instance, Holding, Item', { tags: [TestType.smoke] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);

    OrderLines.addPOLine();
    OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
    OrderLines.backToEditingOrder();
    Orders.openOrder();

    InventorySearch.instanceSearch('Title (all)', orderLineTitle);
    InventorySearch.verifySearchResult(orderLineTitle);
  });
});
