import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe(
  'Orders',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Receiving and Check-in', () => {
      let order;
      let organization;
      let orderLineTitle;
      let orderNumber;
      let user;
      const barcode = Helper.getRandomBarcode();
      const enumeration = 'autotestCaption';

      beforeEach(() => {
        order = {
          ...NewOrder.defaultOneTimeOrder,
          approved: true,
        };
        organization = { ...NewOrganization.defaultUiOrganizations };
        orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
        Organizations.createOrganizationViaApi(organization).then((response) => {
          organization.id = response;
          order.vendor = response;
        });
        cy.createOrderApi(order).then((orderResponse) => {
          orderNumber = orderResponse.body.poNumber;
          Orders.resetFiltersIfActive();
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          OrderLines.addPOLine();
          cy.wait(4000);
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
          cy.waitForAuthRefresh(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(order.id);
        Organizations.deleteOrganizationViaApi(organization.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C735 Receiving pieces from an order for physical material that is set to create Items in inventory (thunderjet)',
        { tags: ['smoke', 'thunderjet', 'C735', 'shiftLeft'] },
        () => {
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          Orders.openOrder();
          InteractorsTools.checkCalloutMessage(
            `The Purchase order - ${orderNumber} has been successfully opened`,
          );
          Orders.receiveOrderViaActions();
          // Receiving part
          Receiving.selectPOLInReceive(orderLineTitle);
          Receiving.receivePiece(0, enumeration, barcode);
          Receiving.checkReceivedPiece(0, enumeration, barcode);
          // inventory part
          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', barcode);
          ItemRecordView.checkItemDetails(
            OrdersHelper.onlineLibraryLocation,
            barcode,
            'In process',
          );
        },
      );
    });
  },
);
