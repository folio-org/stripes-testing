import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const order = { ...NewOrder.defaultOneTimeOrder };
    const orderNumber = Helper.getRandomOrderNumber();
    const editedOrderNumber = Helper.getRandomOrderNumber();
    let user;

    beforeEach(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });

      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
      order.vendor = organization.name;
      order.orderType = 'One-time';
      SettingsOrders.selectContentInGeneralOrders('Edit');
      SettingsOrders.checkUsercaneditPONumberIfNeeded();
      cy.createTempUser([
        permissions.uiSettingsOrdersCanViewAllSettings.gui,
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    afterEach(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsOrdersPath,
        waiter: SettingsOrders.waitLoadingOrderSettings,
      });
      SettingsOrders.selectContentInGeneralOrders('Edit');
      SettingsOrders.uncheckUsercanEditPONumberIfChecked();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C670 Change the PO number setting from editable to non-editable, then create a couple POs to test it (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C670'] },
      () => {
        Orders.createOrderWithPONumber(orderNumber, order, false).then((orderId) => {
          order.id = orderId;
          Orders.checkCreatedOrderWithOrderNumber(organization.name, orderNumber);
        });
      },
    );

    it(
      'C15493 Allow users to edit PO number (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C15493'] },
      () => {
        Orders.createOrderWithPONumber(orderNumber, order, false).then((orderId) => {
          order.id = orderId;
          Orders.checkCreatedOrderWithOrderNumber(organization.name, orderNumber);
          Orders.editOrder();
          Orders.editOrderNumber(editedOrderNumber);
          Orders.checkCreatedOrderWithOrderNumber(organization.name, editedOrderNumber);
        });
      },
    );
  });
});
