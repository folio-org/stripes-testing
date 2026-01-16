import permissions from '../../support/dictionary/permissions';
import Helper from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const subtotalValue = 100;
  const allocatedQuantity = '100';
  const isApprovePayEnabled = false;
  let user;
  const setApprovePayValue = (isEnabled = false) => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValue(isEnabled);
    });
  };
  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    }, 20_000);
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
                Helper.searchByName(defaultFund.name);
                Funds.selectFund(defaultFund.name);
                Funds.addBudget(allocatedQuantity);
                invoiceLine.subTotal = -subtotalValue;
                TopMenuNavigation.openAppFromDropdown('Invoices');
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
          cy.waitForAuthRefresh(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.invoicesPath,
              waiter: Invoices.waitLoading,
            });
          }, 20_000);
          setApprovePayValue(isApprovePayEnabled);
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it('C3453 Pay invoice (thunderjet)', { tags: ['criticalPath', 'thunderjet', 'C3453'] }, () => {
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.payInvoice();
    // check transactions after payment
    TopMenuNavigation.navigateToApp('Finance');
    Helper.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.openTransactions();
    Funds.selectTransactionInList('Credit');
    Funds.varifyDetailsInTransactionFundTo(
      defaultFiscalYear.code,
      '$100.00',
      invoice.invoiceNumber,
      'Credit',
      `${defaultFund.name} (${defaultFund.code})`,
    );
  });
});
