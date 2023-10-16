import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import Parallelization from '../../support/dictionary/parallelization';

Cypress.on('uncaught:exception', () => false);

describe('orders: export', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const integrationName = `FirstIntegrationName${getRandomPostfix()}`;
  const integartionDescription = 'Test Integation descripton1';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  let user;
  let orderNumber = null;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = organization.name;
      order.orderType = 'One-time';
    });
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformationWithoutScheduling(
      integrationName,
      integartionDescription,
      vendorEDICodeFor1Integration,
      libraryEDICodeFor1Integration,
      organization.accounts[0].accountNo,
      'Purchase',
    );
    InteractorsTools.checkCalloutMessage('Integration was saved');
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    SettingsOrders.waitLoadingPurchaseOrderLinesLimit();
    SettingsOrders.setPurchaseOrderLinesLimit(3);
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsView.gui,
      permissions.uiExportOrders.gui,
      permissions.exportManagerAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    SettingsOrders.setPurchaseOrderLinesLimit(1);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350603 Searching POL by specifying acquisition method (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet, Parallelization.nonParallel] },
    () => {
      cy.logout();
      cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
      order.orderType = 'Ongoing';
      Orders.createOrder(order, true, false).then((orderId) => {
        order.id = orderId;
        Orders.createPOLineViaActions();
        OrderLines.fillInPOLineInfoForExport('Purchase');
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        OrderLines.fillInPOLineInfoForExport('Purchase at vendor system');
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        OrderLines.fillInPOLineInfoForExport('Depository');
        Orders.getOrdersApi({ limit: 1, query: `"id"=="${orderId}"` }).then((response) => {
          orderNumber = response[0].poNumber;

          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.selectOrderLines();
          Orders.selectFilterAcquisitionMethod('Purchase');
          Orders.checkOrderlineSearchResults(`${orderNumber}-1`);
          Orders.resetFilters();
          Orders.selectFilterAcquisitionMethod('Purchase at vendor system');
          Orders.checkOrderlineSearchResults(`${orderNumber}-2`);
          Orders.resetFilters();
          Orders.selectFilterAcquisitionMethod('Depository');
          Orders.checkOrderlineSearchResults(`${orderNumber}-3`);
        });
      });
    },
  );
});
