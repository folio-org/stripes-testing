import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
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
import Organizations from '../../support/fragments/organizations/organizations';
import ItemView from '../../support/fragments/inventory/inventoryItem/itemView';
import InventoryInteractionsDefaults from '../../support/fragments/settings/orders/inventoryInteractionsDefaults';

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
    InventoryInteractionsDefaults
      .getConfigurationInventoryInteractions({ query: '(module==ORDERS and configName==approvals)' })
      .then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module:'ORDERS',
            configName:'approvals',
            enabled:true,
            value:'{"isApprovalRequired":false}'
          });
        }
      });
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

  it('C3506 Catalog a new title which has been ordered and received in Orders (prokopovych)', { tags: [TestTypes.smoke, DevTeams.prokopovych] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.openOrder();
    InteractorsTools.checkCalloutMessage(`The Purchase order - ${orderNumber} has been successfully opened`);
    Orders.receiveOrderViaActions();
    Receiving.selectFromResultsList(instanceTitle);
    Receiving.receivePiece(0, caption, barcode);
    Receiving.checkReceivedPiece(0, caption, barcode);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.checkInItem(barcode);
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.instanceTabIsDefault();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', barcode);
    ItemView.verifyItemStatus(ItemView.itemStatuses.inTransit);
  });
});
