import NewOrder from '../../support/fragments/orders/newOrder';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import SearchHelper from '../../support/fragments/finance/financeHelper';
import interactorsTools from '../../support/utils/interactorsTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.defaultOrder };
  const organization = { ...newOrganization.defaultUiOrganizations };
  let orderNumber;

  before(() => {
    cy.getAdminToken();

    cy.createOrganizationApi(organization);
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(body => {
        order.vendor = body.id;
      });

    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        cy.visit(TopMenu.ordersPath);
      });
  });

  afterEach(() => {
    cy.deleteOrderApi(order.id);

    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C343242 Create an order line for format = P/E mix', { tags: [TestType.smoke] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    SearchHelper.selectFromResultsList();
    Orders.createPOLineViaActions();
    OrderLines.fillInPOLineInfoViaUi();
    interactorsTools.checkCalloutMessage('The purchase order line was successfully created');
  });
});
