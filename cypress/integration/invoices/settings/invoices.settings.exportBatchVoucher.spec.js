import TopMenu from '../../../support/fragments/topMenu';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../../support/fragments/invoices/invoices';
import TestType from '../../../support/dictionary/testTypes';
import VendorAddress from '../../../support/fragments/invoices/vendorAddress';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
// import Helper from '../../support/fragments/finance/financeHelper';
// import Transaction from '../../support/fragments/finance/fabrics/newTransaction';
import SettingMenu from '../../../support/fragments/settingsMenu';
import ExportBatchVoucher from '../../../support/fragments/invoices/exportBatchVoucher';

describe('ui-invoices-settings: Export batch voucher', () => {
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

  it('C10943 Run batch voucher export manually', { tags: [TestType.smoke] }, () => {
    Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
    Invoices.createInvoiceLine(invoiceLine);
    Invoices.addFundDistributionToLine(invoiceLine, fund);
    Invoices.approveInvoice();
    cy.visit(SettingMenu.invoiceBGConfigPath);
    ExportBatchVoucher.runManualExport1();
    ExportBatchVoucher.runManualExport3();
  });
});
