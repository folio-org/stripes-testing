import { ORDER_STATUSES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: false,
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
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersAssignAcquisitionUnitsToNewOrder.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersDelete.gui,
      permissions.uiOrdersCancelOrderLines.gui,
      permissions.uiOrdersCancelPurchaseOrders.gui,
      permissions.uiExportOrders.gui,
      permissions.uiOrdersManageAcquisitionUnits.gui,
      permissions.uiOrdersShowAllHiddenFields.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
      permissions.uiOrdersUpdateEncumbrances.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C353627 "Renewal date" and "Renewal interval" are not required for opening, unopening, closing, reopening ongoing order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C353627'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.openOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully opened`,
      );
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.checkReviewDateOnOngoingOrder();
      Orders.unOpenOrder();
      Orders.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.checkReviewDateOnOngoingOrder();
      Orders.openOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully opened`,
      );
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.checkReviewDateOnOngoingOrder();
      Orders.closeOrder('Cancelled');
      Orders.checkOrderStatus(ORDER_STATUSES.CLOSED);
      Orders.checkReviewDateOnOngoingOrder();
    },
  );
});
