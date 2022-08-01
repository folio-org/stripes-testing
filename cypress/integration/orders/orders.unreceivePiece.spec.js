import NewOrder from '../../support/fragments/orders/newOrder';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Unreceive piece from Order', { retries: 3 }, () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = response;
        orderLine.physical.materialSupplier = response;
        orderLine.eresource.accessProvider = response;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after(() => {
    Orders.deleteOrderApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it('C10925 Unreceive piece (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet] }, () => {
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
        // Receive piece
        Helper.selectFromResultsList();
        Receiving.receivePiece(0, caption, barcode);
        Receiving.checkReceivedPiece(0, caption, barcode);
        // Unreceive piece
        Receiving.unreceivePiece();
        Receiving.checkUnreceivedPiece(1, caption);
        // inventory part
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.switchToItem();
        InventorySearch.simpleSearchByParameter('Barcode', barcode);
        Helper.selectFromResultsList();
        InventoryInstance.checkHoldingsTable(OrdersHelper.mainLibraryLocation, 0, caption, barcode, 'On order');
      });
  });
});
