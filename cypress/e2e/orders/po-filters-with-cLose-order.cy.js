import uuid from 'uuid';
import { APPLICATION_NAMES, LOCATION_NAMES, VENDOR_NAMES } from '../../support/constants';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Orders from '../../support/fragments/orders/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import DateTools from '../../support/utils/dateTools';

describe('orders: Test PO filters', { retries: { runMode: 1 } }, () => {
  const today = new Date();
  const renewalDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
  const order = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` })
      .then((organization) => {
        order.vendor = organization.id;
        invoice.vendorName = organization.name;
        orderLine.physical.materialSupplier = organization.id;

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((location) => {
          orderLine.locations[0].locationId = location.id;
        });

        cy.getBookMaterialType().then((materialType) => {
          orderLine.physical.materialType = materialType.id;
          cy.createOrderApi(order).then((orderResponse) => {
            orderNumber = orderResponse.body.poNumber;

            cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
              orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
              orderLine.purchaseOrderId = order.id;
              cy.createOrderLineApi(orderLine);
            });
          });
        });
      })
      .then(() => {
        cy.loginAsAdmin();
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.resetFiltersIfActive();
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
        cy.wait(2000);
        Orders.resetFilters();
      });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
  });

  [
    { filterActions: Orders.selectClosedStatusFilter },
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
    { filterActions: Orders.selectAssignedToFilter },
  ].forEach((filter) => {
    it(
      'C350906 Test the PO filters with closed Order [except tags] (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C350906'] },
      () => {
        cy.wait(5000);
        filter.filterActions();
        Orders.checkSearchResultsWithClosedOrder(orderNumber);
        Orders.resetFilters();
        cy.wait(3000);
      },
    );
  });
});
