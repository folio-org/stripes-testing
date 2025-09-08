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
import TopMenu from '../../support/fragments/topMenu';

describe('Invoices', () => {
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
    });
    invoiceLine.subTotal = -subtotalValue;
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.invoicesPath, waiter: Invoices.waitLoading });
    }, 20_000);
  });

  it(
    'C343209 Create, approve and pay a credit invoice (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft', 'eurekaPhase1'] },
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
        'FY2025',
        '$100.00',
        invoice.invoiceNumber,
        'Pending payment',
        `${fund.name} (${fund.code})`,
      );
      Funds.closeTransactionDetails();
      // pay invoice
      TopMenuNavigation.openAppFromDropdown('Invoices');
      Invoices.searchByNumber(invoice.invoiceNumber);
      Approvals.setApprovePayValue(false);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      // check transactions after payment
      TopMenuNavigation.openAppFromDropdown('Finance');
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        'FY2025',
        '$100.00',
        invoice.invoiceNumber,
        'Credit',
        `${fund.name} (${fund.code})`,
      );
    },
  );
});
