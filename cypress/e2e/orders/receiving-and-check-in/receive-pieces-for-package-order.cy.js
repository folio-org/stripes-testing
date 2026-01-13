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
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
    const firstPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const secondPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const thirdPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const fourthPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    let orderNumber;
    let user;

    before(() => {
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
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
        InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
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

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343213 Receive pieces for package order (thunderjet)',
      { tags: ['criticalPathFlaky', 'thunderjet', 'C343213'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.receiveOrderViaActions();
        // Receiving part
        Receiving.selectPOLInReceive(orderLineTitle);
        Receiving.addPiece(
          firstPiece.displaySummary,
          firstPiece.copyNumber,
          firstPiece.enumeration,
          firstPiece.chronology,
        );
        Receiving.selectPiece(firstPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(firstPiece.enumeration);
        Receiving.addPiece(
          secondPiece.displaySummary,
          secondPiece.copyNumber,
          secondPiece.enumeration,
          secondPiece.chronology,
        );
        Receiving.selectPiece(secondPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(secondPiece.enumeration);
        Receiving.addPiece(
          thirdPiece.displaySummary,
          thirdPiece.copyNumber,
          thirdPiece.enumeration,
          thirdPiece.chronology,
        );
        Receiving.selectPiece(thirdPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(thirdPiece.enumeration);
        Receiving.addPiece(
          fourthPiece.displaySummary,
          fourthPiece.copyNumber,
          fourthPiece.enumeration,
          fourthPiece.chronology,
        );
        Receiving.selectPiece(fourthPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(fourthPiece.enumeration);
        Receiving.selectInstanceInReceive(orderLineTitle);
        // inventory part
        InventoryInstance.openHoldingsAccordion(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.findRowAndClickLink(firstPiece.copyNumber);
        ItemRecordView.verifyEffectiveLocation(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.findRowAndClickLink(secondPiece.enumeration);
        ItemRecordView.verifyEffectiveLocation(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.findRowAndClickLink(thirdPiece.chronology);
        ItemRecordView.verifyEffectiveLocation(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.findRowAndClickLink(fourthPiece.copyNumber);
        ItemRecordView.verifyEffectiveLocation(OrdersHelper.onlineLibraryLocation);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
      },
    );
  });
});
