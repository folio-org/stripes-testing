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
import DateTools from '../../support/utils/dateTools';
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
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
  const allocatedQuantity = '100';
  let user;
  let location;
  let servicePointId;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
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
      cy.intercept('GET', '/finance/funds*', {
        body: {
          funds: [defaultFund],
          totalRecords: 1,
        },
      });
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
      // Need to wait, while data will be loaded
      cy.wait(6000);
      Invoices.approveInvoice();
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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  [
    {
      filterActions: () => {
        Invoices.selectStatusFilter('Approved');
      },
    },
    {
      filterActions: () => {
        Invoices.selectVendorFilter(organization);
      },
    },
    {
      filterActions: () => {
        Invoices.selectInvoiceDateFilter(todayDate, todayDate);
      },
    },
    {
      filterActions: () => {
        Invoices.selectApprovalDateFilter(todayDate, todayDate);
      },
    },
    {
      filterActions: () => {
        cy.intercept('GET', '/finance/funds*', {
          body: {
            funds: [defaultFund],
            totalRecords: 1,
          },
        });
        Invoices.selectFundCodeFilter(defaultFund.code);
      },
    },
    {
      filterActions: () => {
        Invoices.selectButchGroupFilter('FOLIO');
      },
    },
    {
      filterActions: () => {
        cy.intercept('GET', '/finance/fiscal-years*', {
          body: {
            funds: [defaultFiscalYear],
            totalRecords: 1,
          },
        });
        Invoices.selectFiscalYearFilter(defaultFiscalYear.code);
      },
    },
  ].forEach((filter) => {
    it(
      'C6724 Test the invoice filters (thunderjet)',
      { tags: ['criticalPath', 'thunderjet'] },
      () => {
        filter.filterActions();
        Invoices.selectInvoice(invoice.invoiceNumber);
        Invoices.closeInvoiceDetailsPane();
        Invoices.resetFilters();
      },
    );
  });
});
