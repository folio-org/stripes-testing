import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('ui-finance: Orders', () => {
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
    Orders.deleteOrderViaApi(orderId);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C664 Edit an existing PO (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
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
