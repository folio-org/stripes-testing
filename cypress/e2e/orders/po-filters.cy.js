import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import { randomFourDigitNumber } from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';

describe('orders: Test PO filters', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const orderPrefix = `pref${randomFourDigitNumber()}`;
  const orderSuffix = `suf${randomFourDigitNumber()}`;
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    poNumberPrefix: orderPrefix,
    poNumberSuffix: orderSuffix,
    poNumber: `${orderPrefix}${randomFourDigitNumber()}${orderSuffix}`,
    reEncumber: true,
    manualPo: true,
    approved: true,
  };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let orderNumber;
  let orderPrefixId;
  let orderSuffixId;

  before(() => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    SettingsOrders.createPrefixViaApi(order.poNumberPrefix).then((prefixId) => {
      orderPrefixId = prefixId;
    });
    SettingsOrders.createSuffixViaApi(order.poNumberSuffix).then((suffixId) => {
      orderSuffixId = suffixId;
    });

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
    cy.getBookMaterialType().then((materialType) => {
      orderLine.physical.materialType = materialType.id;
      cy.loginAsAdmin();
      cy.getAdminToken();
      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
          orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
          orderLine.purchaseOrderId = order.id;
          cy.createOrderLineApi(orderLine);
        });
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.closeThirdPane();
        Orders.resetFilters();
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    SettingsOrders.deletePrefixViaApi(orderPrefixId);
    SettingsOrders.deleteSuffixViaApi(orderSuffixId);
  });

  [
    { filterActions: Orders.selectOpenStatusFilter },
    { filterActions: () => Orders.selectPrefixFilter(orderPrefix) },
    { filterActions: Orders.selectReEncumberFilter },
    { filterActions: Orders.selectOrderTypeFilter },
    {
      filterActions: () => {
        Orders.selectVendorFilter(invoice);
      },
    },
  ].forEach((filter) => {
    it(
      'C6718 Test the PO filters with open Order [except tags] (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'shiftLeft', 'C6718'] },
      () => {
        filter.filterActions();
        Orders.checkSearchResults(orderNumber);
        Orders.resetFilters();
      },
    );
  });
});
