import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import Invoices from '../../../support/fragments/invoices/invoices';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-finance: Transactions', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };

  const firstOrder = { ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '1000';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear)
      .then(firstFiscalYearResponse => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            firstFund.ledgerId = defaultLedger.id;
            Funds.createViaApi(firstFund)
              .then(fundResponse => {
                firstFund.id = fundResponse.fund.id;
                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(firstFund.name);
                Funds.selectFund(firstFund.name);
                Funds.addBudget(allocatedQuantity);
              });
          });
      });
    ServicePoints.getViaApi()
      .then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
          .then(res => {
            location = res;
          });
      });

    // Prepare 2 Open Orders for Rollover
    Organizations.createOrganizationViaApi(organization)
      .then(responseOrganizations => {
        organization.id = responseOrganizations;
        invoice.accountingCode = organization.erpCode;
      });
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(firstOrder).then(firstOrderResponse => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(firstFund, '100', '1', '100', location.institutionId);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    });
    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCancelInvoices.gui,
      permissions.uiOrdersView.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.fundPath, waiter: Funds.waitLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C375105 Unrelease encumbrance when cancelling approved invoice related to Ongoing order (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(firstFund.name);
    Funds.selectFund(firstFund.name);
    Funds.selectBudgetDetails();
    Funds.viewTransactions();
    Funds.checkTransactionDetails(1, firstFiscalYear.code, '($0.00)', `${orderNumber}-1`, 'Encumbrance', `${firstFund.name} (${firstFund.code})`, 'Released');
    cy.visit(TopMenu.invoicesPath);
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.cancelInvoice();
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(firstFund.name);
    Funds.selectFund(firstFund.name);
    Funds.selectBudgetDetails();
    Funds.viewTransactions();
    Funds.checkTransactionDetails(2, firstFiscalYear.code, '($100.00)', `${orderNumber}-1`, 'Encumbrance', `${firstFund.name} (${firstFund.code})`, 'Unreleased');
    Funds.closeTransactionDetails();
    Funds.checkPaymentInTransactionDetails(1, firstFiscalYear.code, '($100.00)', invoice.invoiceNumber, `${firstFund.name} (${firstFund.code})`, '$100.00');
    Funds.clickInfoInTransactionDetails();
  });
});
