import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import newFund from '../../support/fragments/finance/funds/newFund';
import Funds from '../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../support/utils/dateTools';
import Helper from '../../support/fragments/finance/financeHelper';
import Transaction from '../../support/fragments/finance/fabrics/newTransaction';

describe('ui-invoices: Credit Invoice creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const fund = { ...newFund.defaultFund };
  const subtotalValue = 100;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: `name=${invoice.vendorName}` })
      .then(({ body }) => {
        invoice.accountingCode = body.organizations[0].erpCode;
        Object.assign(vendorPrimaryAddress,
          body.organizations[0].addresses.find(address => address.isPrimary === true));
      });
    cy.getBatchGroups()
      .then(({ body }) => {
        invoice.batchGroup = body.batchGroups[0].name;
      });
    Funds.createFundViaUI(fund)
      .then(
        () => {
          Funds.addBudget(100);
          Funds.checkCreatedBudget(fund.code, getCurrentFiscalYearCode());
        }
      );
    invoiceLine.subTotal = -subtotalValue;
    cy.visit(TopMenu.invoicesPath);
  });

  it('C343209 Create a credit invoice', { tags: [testType.smoke] }, () => {
    Invoices.createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress);
    Invoices.createInvoiceLine(invoiceLine, false);
    Invoices.addFundDistributionToLine(invoiceLine, fund);
    Invoices.approveInvoice();
    // check transactions after approve
    cy.visit(TopMenu.fundPath);
    Helper.searchByName(fund.name);
    Helper.selectFromResultsList();
    Funds.openBudgetDetails(fund.code, getCurrentFiscalYearCode());
    Funds.openTransactions();
    const valueInTransactionTable = `$${subtotalValue.toFixed(2)}`;
    const pendingPaymentTransaction = new Transaction('Pending payment', valueInTransactionTable, fund.code, '', 'Invoice', '');
    Funds.checkTransaction(1, pendingPaymentTransaction);
    // pay invoice
    cy.visit(TopMenu.invoicesPath);
    Invoices.searchByNumber(invoice.invoiceNumber);
    Helper.selectFromResultsList();
    Invoices.payInvoice();
    // check transactions after payment
    cy.visit(TopMenu.fundPath);
    Helper.searchByName(fund.name);
    Helper.selectFromResultsList();
    Funds.openBudgetDetails(fund.code, getCurrentFiscalYearCode());
    Funds.openTransactions();
    const creditTransaction = new Transaction('Credit', valueInTransactionTable, fund.code, '', 'Invoice', '');
    Funds.checkTransaction(1, creditTransaction);
  });
});
