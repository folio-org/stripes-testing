import uuid from 'uuid';
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
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    orderType: 'One-time',
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstInvoice = { ...NewInvoice.defaultUiInvoice };
  const secondInvoice = {
    id: uuid(),
    status: 'Open',
    invoiceDate: DateTools.getCurrentDate(),
    vendorName: 'Amazon.com',
    accountingCode: '',
    batchGroup: '',
    invoiceNumber: FinanceHelp.getRandomInvoiceNumber(),
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
        });
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      firstInvoice.accountingCode = organization.erpCode;
      cy.getBatchGroups().then((batchGroup) => {
        firstInvoice.batchGroup = batchGroup.name;
        secondInvoice.batchGroup = batchGroup.name;
      });
    });
    defaultOrder.vendor = organization.name;
    secondOrder.vendor = organization.name;
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading, authRefresh: true });
    Orders.createApprovedOrderForRollover(defaultOrder, true).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '10',
        '1',
        '10',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(firstInvoice, defaultFiscalYear.code);
    });
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(secondOrder, true).then((secondOrderResponse) => {
      secondOrder.id = secondOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '10',
        '1',
        '10',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(secondInvoice, defaultFiscalYear.code);
    });

    cy.createTempUser([
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C366537 Approve & pay more than one invoice (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C366537'] },
    () => {
      Invoices.searchByNumber(firstInvoice.invoiceNumber);
      Invoices.selectInvoice(firstInvoice.invoiceNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
      Invoices.searchByNumber(secondInvoice.invoiceNumber);
      Invoices.selectInvoice(secondInvoice.invoiceNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance(`${defaultFund.name}(${defaultFund.code})`);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($10.00)',
        secondInvoice.invoiceNumber,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
