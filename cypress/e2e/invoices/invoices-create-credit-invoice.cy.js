import { APPLICATION_NAMES } from '../../support/constants';
import Helper from '../../support/fragments/finance/financeHelper';
import Funds from '../../support/fragments/finance/funds/funds';
import NewFund from '../../support/fragments/finance/funds/newFund';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const fund = { ...NewFund.defaultFund };
  const subtotalValue = 100;
  const actualFiscalYearCode = `FY${new Date().getFullYear()}`;

  before('Create test data and login', () => {
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
    });
    invoiceLine.subTotal = -subtotalValue;

    cy.loginAsAdmin();
    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
    Invoices.waitLoading();
  });

  it(
    'C343209 Create, approve and pay a credit invoice (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C343209', 'shiftLeft'] },
    () => {
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
      Invoices.createInvoiceLine(invoiceLine);
      Approvals.setApprovePayValue(false);
      Invoices.addFundDistributionToLine(invoiceLine, fund);
      Invoices.approveInvoice();
      // check transactions after approve
      TopMenuNavigation.openAppFromDropdown('Finance');
      Helper.selectFundsNavigation();
      Helper.searchByName(fund.name);
      Funds.selectFund(fund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        actualFiscalYearCode,
        '$100.00',
        invoice.invoiceNumber,
        'Pending payment',
        `${fund.name} (${fund.code})`,
      );
      Funds.closeTransactionDetails();
      // pay invoice
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Approvals.setApprovePayValue(false);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      // check transactions after payment
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        actualFiscalYearCode,
        '$100.00',
        invoice.invoiceNumber,
        'Credit',
        `${fund.name} (${fund.code})`,
      );
    },
  );
});
