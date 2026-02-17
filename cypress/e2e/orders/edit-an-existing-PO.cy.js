import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let orderNumber;
  let user;
  let orderId;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      orderId = response.body.id;
    });

    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
      user = userProperties;
    });

    cy.loginAsAdmin({
      path: SettingsMenu.ordersOpeningPurchaseOrdersPath,
      waiter: SettingsOrders.waitLoadingOpeningPurchaseOrders,
    });
    SettingsOrders.expectDisabledCheckboxIsOpenOrderEnabled();
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(orderId);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C664 Edit an existing PO (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C664'] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectPendingStatusFilter();
      Orders.selectFromResultsList(orderNumber);
      Orders.editOrder();
      Orders.selectOngoingOrderTypeInPOForm();
      Orders.saveEditingOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully saved`,
      );
      Orders.checkEditedOngoingOrder(orderNumber, organization.name);
    },
  );
});
