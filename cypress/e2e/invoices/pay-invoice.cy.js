import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Helper from '../../support/fragments/finance/financeHelper';
import Transaction from '../../support/fragments/finance/fabrics/newTransaction';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import Users from '../../support/fragments/users/users';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../support/fragments/finance/funds/funds';

describe('ui-invoices: Approve invoice', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const subtotalValue = 100;
  const allocatedQuantity = '100';
  let user;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.invoiceApprovalsPath,
      waiter: SettingsInvoices.waitApprovalsLoading,
    });
    SettingsInvoices.checkApproveAndPayCheckboxIsDisabled();

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
            defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
            Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
              defaultLedger.id = ledgerResponse.id;
              defaultFund.ledgerId = defaultLedger.id;

              Funds.createViaApi(defaultFund).then((fundResponse) => {
                defaultFund.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
                Helper.searchByName(defaultFund.name);
                Funds.selectFund(defaultFund.name);
                Funds.addBudget(allocatedQuantity);
                invoiceLine.subTotal = -subtotalValue;
                cy.visit(TopMenu.invoicesPath);
                Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
                Invoices.createInvoiceLine(invoiceLine);
                Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
                Invoices.approveInvoice();
              });
            });
          });
        });
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.viewEditCreateInvoiceInvoiceLine.gui,
          permissions.uiInvoicesApproveInvoices.gui,
          permissions.uiInvoicesPayInvoices.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
      },
    );
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C3453 Pay invoice (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      const transactionFactory = new Transaction();
      const valueInTransactionTable = `$${subtotalValue.toFixed(2)}`;
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      // check transactions after payment
      cy.visit(TopMenu.fundPath);
      Helper.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.checkTransaction(
        1,
        transactionFactory.create(
          'credit',
          valueInTransactionTable,
          defaultFund.code,
          '',
          'Invoice',
          '',
        ),
      );
    },
  );
});
