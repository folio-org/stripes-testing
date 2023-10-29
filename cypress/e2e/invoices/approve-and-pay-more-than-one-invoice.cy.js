import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import DateTools from '../../support/utils/dateTools';

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
  const allocatedQuantity = '100';
  let user;
  let servicePointId;
  let location;

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
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(defaultOrder).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '10',
        '1',
        '10',
        location.institutionId,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(firstInvoice, defaultFiscalYear.code);
    });
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(secondOrder).then((secondOrderResponse) => {
      secondOrder.id = secondOrderResponse.id;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '10',
        '1',
        '10',
        location.institutionId,
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
      });
    });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C366537: Approve & pay more than one invoice (thunderjet) (TaaS)',
    { tags: [testType.extendedPath, devTeams.thunderjet] },
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
