import newOrder from '../../support/fragments/orders/newOrder';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import testType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';

describe('orders: Receive piece from Order', () => {
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };

  before(() => {
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
        Orders.openOrder();
        InteractorsTools.checkCalloutMessage(`The Purchase order - ${orderNumber} has been successfully opened`);
        Orders.receiveOrderViaActions();
        // Receiving part
        Helper.selectFromResultsList();
        Receiving.receivePiece(0, caption, barcode);
        Receiving.checkReceivedPiece(0, caption, barcode);
        // inventory part
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.switchToItem();
        InventorySearch.searchByParameter('Barcode', barcode);
        Helper.selectFromResultsList();
        InventoryInstance.checkHoldingsTable(OrdersHelper.mainLibraryLocation, 0, caption, barcode, 'In process');
      });
  });
});
