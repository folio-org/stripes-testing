import newOrder from '../../../support/fragments/orders/newOrder';
import basicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import testType from '../../../support/dictionary/testTypes';
import Orders from '../../../support/fragments/orders/orders';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import InteractorsTools from '../../../support/utils/interactorsTools';
import OrdersHelper from '../../../support/fragments/orders/ordersHelper';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';

describe('orders: Receive piece from Order', () => {
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };
  let orderNumber;
  const barcode = Helper.getRandomBarcode();
  const caption = 'autotestCaption';

  before(() => {
    cy.getAdminToken();
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
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(res => {
        orderNumber = res;
      });
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
  });

  after('', () => {
    Orders.deleteOrderApi(orderNumber);
  });

  it('C735 Receiving pieces from an order for physical material that is set to create Items in inventory', { tags: [testType.smoke] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Helper.selectFromResultsList();
    Orders.openOrder();
    InteractorsTools.checkCalloutMessage(`The Purchase order - ${orderNumber} has been successfully opened`);
    Orders.receiveOrderViaActions();
    Helper.selectFromResultsList();
    Receiving.receivePiece(0, caption, barcode);
    Receiving.checkReceivedPiece(0, caption, barcode);

    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(barcode);

    cy.visit(TopMenu.inventoryPath);
    InventorySearch.instanceTabIsDefault();
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.switchToItem();
    InventorySearch.simpleSearchByParameter('Barcode', barcode);
    InventorySearch.expandHoldingsSection();
    InventorySearch.verifySearchResult('In transit');
  });
});
