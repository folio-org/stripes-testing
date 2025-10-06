import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import Funds from '../../support/fragments/finance/funds/funds';
import NewFund from '../../support/fragments/finance/funds/newFund';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import Approvals from '../../support/fragments/settings/invoices/approvals';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFund = { ...NewFund.defaultFund };
  const subtotalValue = 100;
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
      (organization) => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(
          vendorPrimaryAddress,
          organization.addresses.find((address) => address.isPrimary === true),
        );
        cy.getBatchGroups().then((batchGroup) => {
          invoice.batchGroup = batchGroup.name;
          Funds.createFundViaUI(defaultFund).then(() => {
            Funds.addBudget(100);
            Funds.checkCreatedBudget(defaultFund.code, DateTools.getCurrentFiscalYearCode());
            invoiceLine.subTotal = -subtotalValue;
            TopMenuNavigation.openAppFromDropdown('Invoices');
            Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
            Invoices.createInvoiceLine(invoiceLine);
            Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
          });
        });
      },
    );
    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesApproveInvoices.gui,
    ]).then((userProperties) => {
      user = userProperties;
      Approvals.setApprovePayValue(false);
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10945 Approve invoice (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.approveInvoice();
      // check transactions after approve
      TopMenuNavigation.navigateToApp('Finance');
      Helper.selectFundsNavigation();
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.openBudgetDetails(defaultFund.code, DateTools.getCurrentFiscalYearCode());
      Funds.openTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        DateTools.getCurrentFiscalYearCode(),
        '$100.00',
        invoice.invoiceNumber,
        'Pending payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
