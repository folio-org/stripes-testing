import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import interactorsTools from '../../support/utils/interactorsTools';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
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
  });

  it(
    'C343242 Create an order line for format = P/E mix (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C343242', 'shiftLeft'] },
    () => {
      cy.wait(4000);
      Orders.resetFilters();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.createPOLineViaActions();
      OrderLines.fillInPOLineInfoViaUi();
      interactorsTools.checkCalloutMessage('The purchase order line was successfully created');
    },
  );
});
