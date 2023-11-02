import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Users from '../../support/fragments/users/users';
import OrderLines from '../../support/fragments/orders/orderLines';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('orders: Export', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    paymentMethod: 'EFT',
  };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    poNumberPrefix: 'pref',
    poNumberSuffix: 'suf',
    poNumber: `pref${generateItemBarcode()}suf`,
    manualPo: false,
    approved: true,
  };
  let orderNumber;
  let user;
  let orderID;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      orderID = response.body.id;
    });
    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(orderID);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350601 Select Acquisition method from controlled vocabulary list [except tags] (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.fillInPOLineInfoViaUi();
      InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
    },
  );
});
