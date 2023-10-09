import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
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
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Users from '../../support/fragments/users/users';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';

describe('orders: Receive piece from Order', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  let orderNumber;
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
    cy.createOrderApi(order).then((orderResponse) => {
      orderNumber = orderResponse.body.poNumber;
      cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C735 Receiving pieces from an order for physical material that is set to create Items in inventory (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      const barcode = Helper.getRandomBarcode();
      const caption = 'autotestCaption';
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.openOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully opened`,
      );
      Orders.receiveOrderViaActions();
      // Receiving part
      Receiving.selectPOLInReceive(orderLineTitle);
      Receiving.receivePiece(0, caption, barcode);
      Receiving.checkReceivedPiece(0, caption, barcode);
      // inventory part
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', barcode);
      ItemRecordView.checkItemDetails(OrdersHelper.onlineLibraryLocation, barcode, 'In process');
    },
  );
});
