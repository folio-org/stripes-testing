import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import OrderLines from '../../support/fragments/orders/orderLines';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Organizations from '../../support/fragments/organizations/organizations';
import InventoryInteractionsDefaults from '../../support/fragments/settings/orders/inventoryInteractionsDefaults';
import devTeams from '../../support/dictionary/devTeams';

describe('orders: create an order', { retries: 3 }, () => {
  const organization = { ...newOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLineTitle = basicOrderLine.defaultOrderLine.titleOrPackage;
  const interactions = {
    module: 'ORDERS',
    enabled: true,
    configName: 'createInventory',
    value: '{"eresource":"Instance, Holding","physical":"Instance, Holding, Item","other":"None"}',
  };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    InventoryInteractionsDefaults.getConfigurationInventoryInteractions({ limit: 1, query: '("module"="ORDERS" and "configName"="createInventory")' })
      .then(responseInventory => {
        interactions.id = responseInventory.configs[0].id;
        InventoryInteractionsDefaults.setConfigurationInventoryInteractions(interactions);
      });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.ordersPath);
  });

  after(() => {
    Orders.deleteOrderApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it('C734 Open order for physical material set to create Instance, Holding, Item (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet, TestType.broken] }, () => {
    Orders.createOrder(order).then(orderId => {
      order.id = orderId;
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
});
