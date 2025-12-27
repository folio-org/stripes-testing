import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';

describe('orders: Test PO filters', { retries: { runMode: 1 } }, () => {
  const today = new Date();
  const renewalDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let orderNumber;

  before(() => {
    cy.getAdminToken();
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
    cy.getBookMaterialType()
      .then((materialType) => {
        orderLine.physical.materialType = materialType.id;
        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
          cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
            orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
            orderLine.purchaseOrderId = order.id;
            cy.createOrderLineApi(orderLine);
          });
        });
      })
      .then(() => {
        cy.loginAsAdmin({
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
          authRefresh: true,
        });
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

  after(() => {
    cy.getAdminToken();
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
      { tags: ['smoke', 'thunderjet', 'eurekaPhase1'] },
      () => {
        filter.filterActions();
        Orders.checkSearchResultsWithClosedOrder(orderNumber);
        Orders.resetFilters();
      },
    );
  });
});
