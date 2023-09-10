import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('orders: export', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    poNumberPrefix: 'pref',
    poNumberSuffix: 'suf',
    poNumber: `pref${generateItemBarcode()}suf`,
    reEncumber: true,
    manualPo: true,
    approved: true,
  };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
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
        Orders.openOrder();
        Orders.closeThirdPane();
        Orders.resetFilters();
      });
    });
    cy.createTempUser([permissions.uiOrdersView.gui, permissions.uiExportOrders.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it(
    'C196749 Export orders based on orders search (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      Orders.selectOpenStatusFilter();
      Orders.exportResoultsCSV();
    },
  );
});
