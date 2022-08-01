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
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-invoices: Credit Invoice creation', { retries: 3 }, () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const fund = { ...NewFund.defaultFund };
  const organization = { ...NewOrganization.defaultUiOrganizations,
    addresses:[{
      addressLine1: '1 Centerpiece Blvd.',
      addressLine2: 'P.O. Box 15550',
      city: 'New Castle',
      stateRegion: 'DE',
      zipCode: '19720-5550',
      country: 'USA',
      isPrimary: true,
      categories: [],
      language: 'English'
    }] };
  const subtotalValue = 100;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    invoice.vendorName = organization.name;
    invoice.accountingCode = organization.erpCode;
    Object.assign(vendorPrimaryAddress,
      organization.addresses.find(address => address.isPrimary === true));
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

  after(() => {
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it('C343209 Create a credit invoice (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet] }, () => {
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
