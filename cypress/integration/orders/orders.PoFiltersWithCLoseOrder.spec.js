import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import SearchHelper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import DateTools from '../../support/utils/dateTools';

describe('orders: Test PO filters', () => {
  const today = new Date();
  const renewalDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
  const order = { ...NewOrder.defaultOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let orderNumber;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => {
        orderLine.physical.materialType = materialType.id;
        cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
        cy.createOrderApi(order)
          .then((response) => {
            orderNumber = response.body.poNumber;
            cy.getAcquisitionMethodsApi({ query: 'value="Other"' })
              .then(params => {
                orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
                orderLine.purchaseOrderId = order.id;
                cy.createOrderLineApi(orderLine);
              });
            cy.visit(TopMenu.ordersPath);
            Orders.searchByParameter('PO number', orderNumber);
            SearchHelper.selectFromResultsList();
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
    Orders.deleteOrderApi(order.id);
  });

  [
    { filterActions: Orders.selectClosedStatusFilter },
    { filterActions: Orders.selectAssignedToFilter },
    { filterActions: Orders.selectReasonForClosureFilter },
    { filterActions: () => { Orders.selectRenewalDateFilter(renewalDate); } },
    { filterActions: () => { Orders.selectVendorFilter(invoice); } },
  ].forEach((filter) => {
    it('C350906 Test the PO filters with closed Order [except tags]', { tags: [TestType.smoke] }, () => {
      filter.filterActions();
      Orders.checkSearchResultsWithClosedOrder(orderNumber);
      Orders.resetFilters();
    });
  });
});
