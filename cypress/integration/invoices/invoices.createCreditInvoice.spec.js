import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import TestType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import NewFund from '../../support/fragments/finance/funds/newFund';
import Funds from '../../support/fragments/finance/funds/funds';
import DateTools from '../../support/utils/dateTools';
import Helper from '../../support/fragments/finance/financeHelper';
import Transaction from '../../support/fragments/finance/fabrics/newTransaction';

describe('ui-invoices: Credit Invoice creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const fund = { ...NewFund.defaultFund };
  const subtotalValue = 100;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: `name=${invoice.vendorName}` })
      .then(organization => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(vendorPrimaryAddress,
          organization.addresses.find(address => address.isPrimary === true));
      });
    cy.getBatchGroups()
      .then(batchGroup => { invoice.batchGroup = batchGroup.name; });
    Funds.createFundViaUI(fund)
      .then(
        () => {
          Funds.addBudget(100);
          Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
        }
      );
    invoiceLine.subTotal = -subtotalValue;
    cy.visit(TopMenu.invoicesPath);
  });

  it('C343209 Create a credit invoice', { tags: [TestType.smoke] }, () => {
    const transactionFactory = new Transaction();
    Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
    Invoices.createInvoiceLine(invoiceLine);
    Invoices.addFundDistributionToLine(invoiceLine, fund);
    Invoices.approveInvoice();
    // check transactions after approve
    cy.visit(TopMenu.fundPath);
    Helper.searchByName(fund.name);
    Helper.selectFromResultsList();
    Funds.openBudgetDetails(fund.code, DateTools.getCurrentFiscalYearCode());
    Funds.openTransactions();
    const valueInTransactionTable = `$${subtotalValue.toFixed(2)}`;
    Funds.checkTransaction(1, transactionFactory.create('pending', valueInTransactionTable, fund.code, '', 'Invoice', ''));
    // pay invoice
    cy.visit(TopMenu.invoicesPath);
    Invoices.searchByNumber(invoice.invoiceNumber);
    Helper.selectFromResultsList();
    Invoices.payInvoice();
    // check transactions after payment
    cy.visit(TopMenu.fundPath);
    Helper.searchByName(fund.name);
    Helper.selectFromResultsList();
    Funds.openBudgetDetails(fund.code, DateTools.getCurrentFiscalYearCode());
    Funds.openTransactions();
    Funds.checkTransaction(1, transactionFactory.create('credit', valueInTransactionTable, fund.code, '', 'Invoice', ''));
  });
});
