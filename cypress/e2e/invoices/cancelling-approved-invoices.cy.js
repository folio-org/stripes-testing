import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('ui-invoices: Cancelling approved invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.specialOrganization };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  const allocatedQuantity = '100';
  const subtotalValue = 100;
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.invoiceApprovalsPath,
      waiter: SettingsInvoices.waitApprovalsLoading,
    });
    SettingsInvoices.checkApproveAndPayCheckboxIsDisabled();

    FiscalYears.createViaApi(defaultFiscalYear).then((responseFY) => {
      defaultFiscalYear.id = responseFY.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          Helper.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganization) => {
      organization.id = responseOrganization;
      order.vendor = responseOrganization;
      invoice.accountingCode = organization.erpCode;
      invoice.vendorName = organization.name;
      cy.createOrderApi(order).then((responseOrder) => {
        orderNumber = responseOrder.body.poNumber;
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.createPOLineViaActions();
        OrderLines.POLineInfodorPhysicalMaterialWithFund(orderLineTitle, defaultFund);
        Orders.backToPO();
        Orders.openOrder();
      });
      cy.getBatchGroups().then((batchGroup) => {
        invoice.batchGroup = batchGroup.name;
        invoiceLine.subTotal = -subtotalValue;
        cy.visit(TopMenu.invoicesPath);
        Invoices.createSpecialInvoice(invoice);
        Invoices.createInvoiceLineFromPol(orderNumber);
        // Need to wait,while Invoice Line will be laoded fully
        cy.wait(4000);
        Invoices.approveInvoice();
      });
    });
    cy.wait(10000);
    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      permissions.uiInvoicesCancelInvoices.gui,
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
    'C350728 Cancelling approved invoices voids payments/credits and Unreleases encumbrances (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'nonParallel'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransaction('row-1');
      Funds.checkEncumbrance(orderNumber);
      Funds.selectTransaction('row-2');
      Funds.checkPendingPayment(invoice.invoiceNumber);
      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.cancelInvoice();
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransaction('row-1');
      Funds.checkCancelPendingPayment(invoice.invoiceNumber);
    },
  );
});
