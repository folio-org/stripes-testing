import TestTypes from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';

describe('ui-inventory: Item status date updates', () => {
  const order = { ...NewOrder.specialOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  let createdOrderNumber;

  before('navigate to inventory', () => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        createdOrderNumber = orderNumber;
      });
  });

  after(() => {

  });

  it('C9200 Item status date updates', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', createdOrderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
  });
});
