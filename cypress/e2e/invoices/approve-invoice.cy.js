import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import NewFund from '../../support/fragments/finance/funds/newFund';
import Funds from '../../support/fragments/finance/funds/funds';
import DateTools from '../../support/utils/dateTools';
import Helper from '../../support/fragments/finance/financeHelper';
import Transaction from '../../support/fragments/finance/fabrics/newTransaction';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-invoices: Approve invoice', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const defaultFund = { ...NewFund.defaultFund };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const subtotalValue = 100;
  let user;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path:SettingsMenu.invoiceApprovalsPath, waiter: SettingsInvoices.waitApprovalsLoading });
    SettingsInvoices.checkApproveAndPayCheckboxIsDisabled();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    invoice.vendorName = organization.name;
    Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` })
    .then(organizationResponse => {
      invoice.accountingCode = organizationResponse.erpCode;
      cy.getBatchGroups()
          .then(batchGroup => { 
            invoice.batchGroup = batchGroup.name;
            Funds.createFundViaUI(defaultFund)
            .then(() => {
                Funds.addBudget(100);
                Funds.checkCreatedBudget(defaultFund.code, DateTools.getCurrentFiscalYearCode());
                invoiceLine.subTotal = -subtotalValue;
                cy.visit(TopMenu.invoicesPath);
                Invoices.createInvoiceWithoutVendorAdress(invoice);
                Invoices.createInvoiceLine(invoiceLine);
                Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
            });
        });
    });
    cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.viewEditCreateInvoiceInvoiceLine.gui,
        permissions.uiInvoicesApproveInvoices.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, { path:TopMenu.invoicesPath, waiter: Invoices.waitLoading });
        });
  });
  
  after(() => {
    Users.deleteViaApi(user.userId);
  });
  
  it('C10945 Approve invoice (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    const transactionFactory = new Transaction();
    Invoices.searchByNumber(invoice.invoiceNumber);
    Helper.selectFromResultsList();
    Invoices.approveInvoice();
    // check transactions after approve
    cy.visit(TopMenu.fundPath);
    Helper.searchByName(defaultFund.name);
    Helper.selectFromResultsList();
    Funds.openBudgetDetails(defaultFund.code, DateTools.getCurrentFiscalYearCode());
    Funds.openTransactions();
    const valueInTransactionTable = `$${subtotalValue.toFixed(2)}`;
    Funds.checkTransaction(1, transactionFactory.create('pending', valueInTransactionTable, defaultFund.code, '', 'Invoice', ''));
  });
});