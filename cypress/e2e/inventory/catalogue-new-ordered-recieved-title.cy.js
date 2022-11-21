import testType from '../../support/dictionary/testTypes';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Organizations from '../../support/fragments/organizations/organizations';

describe('orders: Receive piece from Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const barcode = Helper.getRandomBarcode();
  const caption = 'autotestCaption';
  const companyName = 'Amazon.com';
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let orderNumber;
  let location;

  before(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name=${companyName}` })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });

    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(res => {
        location = res;
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder(),
          BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, location.id)
        )
          .then(response => {
            orderNumber = response;
          });
        orderLine.locations[0].locationId = location.id;
      });

    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });

    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
  });

  after('Deleting order', () => {
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(res => {
        Orders.deleteOrderApi(res[0].id);
      });
  });

  it('C735 Receiving pieces from an order for physical material that is set to create Items in inventory (thunderjet)', { tags: [testType.smoke] }, () => {
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
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcode);
    InventoryInstance.openHoldings(['Main Library >']);
    InventorySearchAndFilter.verifySearchResult('In transit');
  });
});
