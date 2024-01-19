import Transaction from '../../support/fragments/finance/fabrics/newTransaction';
import Helper from '../../support/fragments/finance/financeHelper';
import Funds from '../../support/fragments/finance/funds/funds';
import NewFund from '../../support/fragments/finance/funds/newFund';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';

describe('ui-invoices: Credit Invoice creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const fund = { ...NewFund.defaultFund };
  const subtotalValue = 100;

  before(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
      (organization) => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(
          vendorPrimaryAddress,
          organization.addresses.find((address) => address.isPrimary === true),
        );
      },
    );
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });
    Funds.createFundViaUI(fund).then(() => {
      Funds.addBudget(100);
      Funds.checkCreatedBudget(fund.code, DateTools.getCurrentFiscalYearCode());
    });
    invoiceLine.subTotal = -subtotalValue;
    cy.visit(TopMenu.invoicesPath);
  });

  it(
    'C343209: Create, approve and pay a credit invoice (thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      const transactionFactory = new Transaction();
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
      Invoices.createInvoiceLine(invoiceLine);
      Invoices.addFundDistributionToLine(invoiceLine, fund);
      Invoices.approveInvoice();
      // check transactions after approve
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(fund.name);
      Funds.selectFund(fund.name);
      Funds.openBudgetDetails(fund.code, DateTools.getCurrentFiscalYearCode());
      Funds.openTransactions();
      const valueInTransactionTable = `$${subtotalValue.toFixed(2)}`;
      Funds.checkTransaction(
        1,
        transactionFactory.create('pending', valueInTransactionTable, fund.code, '', 'Invoice', ''),
      );
      // pay invoice
      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      // check transactions after payment
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(fund.name);
      Funds.selectFund(fund.name);
      Funds.openBudgetDetails(fund.code, DateTools.getCurrentFiscalYearCode());
      Funds.openTransactions();
      Funds.checkTransaction(
        1,
        transactionFactory.create('credit', valueInTransactionTable, fund.code, '', 'Invoice', ''),
      );
    },
  );
});
