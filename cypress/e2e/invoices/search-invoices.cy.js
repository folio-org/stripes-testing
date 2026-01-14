import { ORDER_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: ORDER_TYPES.ONGOING,
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
  };
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
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let location;
  let servicePointId;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    cy.getAdminToken();
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });
    Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
      organization.id = organizationsResponse;
      order.vendor = organizationsResponse;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.invoicesPath, waiter: Invoices.waitLoading });
    Invoices.searchByParameter('All', invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.selectInvoiceLine();
    Invoices.deleteInvoiceLineViaActions();
    Invoices.deleteInvoiceViaActions();
    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    OrderLines.selectPOLInOrder(0);
    OrderLines.deleteOrderLine();
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6723 Test the invoice searches (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6723'] },
    () => {
      Invoices.searchByParameter('All', invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();

      Invoices.searchByParameter('Vendor invoice number', invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();

      Invoices.searchByParameter('PO number', orderNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();

      Invoices.searchByParameter('Accounting code', organization.erpCode);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.closeInvoiceDetailsPane();
      Invoices.resetFilters();
    },
  );
});
