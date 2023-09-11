import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import DateTools from '../../support/utils/dateTools';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Test PO filters', () => {
  const today = new Date();
  const renewalDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let orderNumber;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
      orderLine.physical.materialSupplier = response;
      orderLine.eresource.accessProvider = response;
    });
    invoice.vendorName = organization.name;
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
      orderLine.physical.materialType = materialType.id;
      cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
          orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
          orderLine.purchaseOrderId = order.id;
          cy.createOrderLineApi(orderLine);
        });
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.editOrder();
        Orders.assignOrderToAdmin();
        Orders.selectOngoingOrderType();
        Orders.fillOngoingInformation(renewalDate);
        Orders.saveEditingOrder();
        Orders.openOrder();
        Orders.closeOrder('Cancelled');
        Orders.closeThirdPane();
        Orders.resetFilters();
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  [
    { filterActions: Orders.selectClosedStatusFilter },
    { filterActions: Orders.selectAssignedToFilter },
    { filterActions: Orders.selectReasonForClosureFilter },
    {
      filterActions: () => {
        Orders.selectRenewalDateFilter(renewalDate);
      },
    },
    {
      filterActions: () => {
        Orders.selectVendorFilter(invoice);
      },
    },
  ].forEach((filter) => {
    it(
      'C350906 Test the PO filters with closed Order [except tags] (thunderjet)',
      { tags: [TestType.smoke, devTeams.thunderjet] },
      () => {
        filter.filterActions();
        Orders.checkSearchResultsWithClosedOrder(orderNumber);
        Orders.resetFilters();
      },
    );
  });
});
