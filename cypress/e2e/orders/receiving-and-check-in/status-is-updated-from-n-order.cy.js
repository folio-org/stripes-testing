import { ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import OrdersHelper from '../../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Orders: Receiving and Check-in', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  const copyNumber = Helper.getRandomBarcode();
  const enumeration = Helper.getRandomBarcode();
  const chronology = Helper.getRandomBarcode();
  const caption = Helper.getRandomBarcode();
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
      OrderLines.POLineInfodorPhysicalMaterialForRecieve(orderLineTitle);
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
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C737 Validate when receiving a piece that the item status is updated from "On order" (thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
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
      Receiving.addPiece(caption, copyNumber, enumeration, chronology);
      Receiving.selectPiece(caption);
      Receiving.openDropDownInEditPieceModal();
      Receiving.quickReceivePiece(enumeration);
      Receiving.selectInstanceInReceive(orderLineTitle);
      // inventory part
      InventoryInstance.openHoldingsAccordion(OrdersHelper.onlineLibraryLocation);
      ItemRecordView.findRowAndClickLink(copyNumber);
      ItemRecordView.verifyEffectiveLocation(OrdersHelper.onlineLibraryLocation);
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
    },
  );
});
