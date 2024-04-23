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

describe('ui-invoices: Cancelling approved invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };

  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const firstOrder = {
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

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
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      firstOrder.orderType = 'One-time';
    });
    secondOrder.vendor = organization.name;
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(secondOrder, true).then((firstOrderResponse) => {
      secondOrder.id = firstOrderResponse.id;
      firstOrderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(secondOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '20',
        '1',
        '20',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.createTempUser([
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });
  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C347897 Approve invoice with both payment and credit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '10');
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '-10');
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '10');
      Invoices.approveInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$10.00', '$10.00', '$0.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($10.00)',
        `${firstOrderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$10.00', '$0.00', '$10.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        firstFiscalYear.code,
        '$10.00',
        invoice.invoiceNumber,
        'Credit',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
