import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import Funds from '../../support/fragments/finance/funds/funds';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const subtotalValue = 100;
  let user;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
    Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
      (organization) => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(
          vendorPrimaryAddress,
          organization.addresses.find((address) => address.isPrimary === true),
        );
        cy.getBatchGroups().then((batchGroup) => {
          invoice.batchGroup = batchGroup.name;
          FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
            defaultFiscalYear.id = firstFiscalYearResponse.id;
            defaultBudget.fiscalYearId = firstFiscalYearResponse.id;
            defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
            Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
              defaultLedger.id = ledgerResponse.id;
              defaultFund.ledgerId = defaultLedger.id;
              Funds.createViaApi(defaultFund).then((fundResponse) => {
                defaultFund.id = fundResponse.fund.id;
                defaultBudget.fundId = fundResponse.fund.id;
                Budgets.createViaApi(defaultBudget);
              });
            });
          });
          invoiceLine.subTotal = -subtotalValue;
          Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
          Invoices.createInvoiceLine(invoiceLine);
          Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
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
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it('C10945 Approve invoice (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.approveInvoice();
    // check transactions after approve
    TopMenuNavigation.navigateToApp('Finance');
    Helper.selectFundsNavigation();
    Helper.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.openBudgetDetailsByBudgetName(defaultBudget);
    Funds.openTransactions();
    Funds.selectTransactionInList('Pending payment');
    Funds.varifyDetailsInTransaction(
      defaultFiscalYear.code,
      '$100.00',
      invoice.invoiceNumber,
      'Pending payment',
      `${defaultFund.name} (${defaultFund.code})`,
    );
  });
});
