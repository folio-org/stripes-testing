import newOrder from '../../support/fragments/orders/newOrder';
import newOrderLine from '../../support/fragments/orders/newOrderLine';
import testType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('orders: Receive piece from Order', () => {
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...newOrderLine.defaultOrderLine };
  const locationName = 'Main Library';

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(({ body }) => {
        order.vendor = body.organizations[0].id;
        orderLine.physical.materialSupplier = body.organizations[0].id;
        orderLine.eresource.accessProvider = body.organizations[0].id;
      });
    cy.getLocations({ query: `name="${locationName}"` })
      .then(({ body }) => {
        orderLine.locations[0].locationId = body.locations[0].id;
      });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(({ body }) => {
        orderLine.physical.materialType = body.mtypes[0].id;
      });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C735 Receiving pieces from an order for physical material that is set to create Items in inventory', { tags: [testType.smoke] }, () => {
    // TODO: update test case in test rail to reflect business actions
    const barcode = Helper.getRandomBarcode();
    const caption = 'autotestCaption';
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Helper.selectFromResultsList();
        Orders.openOrderViaActions();
        Helper.checkCalloutMessage(`The Purchase order - ${orderNumber} has been successfully opened`, 'success');
        Orders.receiveOrderViaActions();
        // Receiving part
        Helper.selectFromResultsList();
        Receiving.receivePiece(0, caption, barcode);
        Receiving.checkReceivedPiece(0, caption, barcode);
        // inventory part
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.searchItemByParameter('Barcode', barcode);
        Helper.selectFromResultsList();
        InventoryInstance.checkHoldingsTable(locationName, 0, caption, barcode, 'In process');
      });
  });
});
