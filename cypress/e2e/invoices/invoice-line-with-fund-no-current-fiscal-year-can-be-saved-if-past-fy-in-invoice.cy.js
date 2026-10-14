import { INVOICE_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';

const INVOICE_LINE_DESCRIPTION = 'AT_C627533_Invoice_Line';
const INVOICE_LINE_QUANTITY = '1';
const INVOICE_LINE_SUBTOTAL = '10';
const BUDGET_ALLOCATED_AMOUNT = 1000;

describe('Invoices', () => {
  describe('Invoice Lines', () => {
    const flow = new ExecutionFlowManager();
    const date = new Date();
    const R = {
      ORG: 'org',
      FY: 'fy',
      LEDGER: 'ledger',
      FUND: 'fund',
      BUDGET: 'budget',
      INVOICE: 'invoice',
      USER: 'user',
    };

    before('Create C627533 preconditions', () => {
      cy.getAdminToken();
      flow
        .step((f) => {
          // Precondition: Organization-vendor for invoice
          return Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization(), {
            returnBody: true,
          }).then((org) => f.set(R.ORG, org, (v) => Organizations.deleteOrganizationViaApi(v.id)));
        })
        .step((f) => {
          // Precondition 1: Current fiscal year is created
          return FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            periodStart: new Date(date.getFullYear(), 0, 1),
            periodEnd: new Date(date.getFullYear(), 11, 31),
          }).then((fy) => f.set(R.FY, fy, (v) => FiscalYears.deleteFiscalYearViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 2: Active Ledger related to the created fiscal year
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FY).id,
          }).then((ledger) => f.set(R.LEDGER, ledger, (v) => Ledgers.deleteLedgerViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Active Fund #1 related to the Ledger
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
          }).then((response) => f.set(R.FUND, response.fund, (v) => Funds.deleteFundViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 3: Current budget with money allocation for Fund #1
          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: BUDGET_ALLOCATED_AMOUNT,
            fiscalYearId: f.get(R.FY).id,
            fundId: f.get(R.FUND).id,
          }).then((budget) => f.set(R.BUDGET, budget, (v) => Budgets.deleteViaApi(v.id, false)));
        })
        .step((f) => {
          // Precondition 4: Fiscal year period changed to dates in the past
          return FiscalYears.updateFiscalYearViaApi({
            ...f.get(R.FY),
            _version: 1,
            periodStart: new Date(date.getFullYear() - 1, 0, 1),
            periodEnd: new Date(date.getFullYear() - 1, 11, 31),
          });
        })
        .step((f) => {
          // Precondition 5: Invoice without invoice line with Fiscal year from Precondition #1
          return Invoices.createInvoiceViaApi({
            vendorId: f.get(R.ORG).id,
            fiscalYearId: f.get(R.FY).id,
          }).then((invoice) => f.set(R.INVOICE, invoice, (v) => Invoices.deleteInvoiceViaApi(v.id)));
        })
        .step((f) => {
          // Precondition 6: User with Invoice: Can view, edit and create new Invoices and Invoice lines
          return cy
            .createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui])
            .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
        })
        .step((f) => {
          // Precondition 7: Log in and navigate to Invoices app
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        })
        .step((f) => {
          // Precondition 7: Search for invoice from Precondition #5
          return Invoices.searchByNumber(f.get(R.INVOICE).vendorInvoiceNo);
        });
    });

    after('Delete C627533 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C627533 Invoice line with fund that has NO current fiscal year could be saved if past FY is populated in invoice (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C627533'] },
      () => {
        cy.log('<--- STEP 1 --->');
        Invoices.selectInvoice(flow.get(R.INVOICE).vendorInvoiceNo);
        InvoiceView.waitLoading();
        InvoiceView.verifyStatus(INVOICE_STATUSES.OPEN);
        InvoiceView.checkInvoiceDetails({ title: flow.get(R.INVOICE).vendorInvoiceNo });

        cy.log('<--- STEP 2 --->');
        Invoices.createInvoiceLineNewBlankLine();
        InvoiceLineEditForm.waitLoading();

        cy.log('<--- STEP 3 --->');
        InvoiceLineEditForm.fillInvoiceLineFields({
          description: INVOICE_LINE_DESCRIPTION,
          quantity: INVOICE_LINE_QUANTITY,
          subTotal: INVOICE_LINE_SUBTOTAL,
        });
        InvoiceLineEditForm.clickAddFundDistributionButton();
        InvoiceLineEditForm.selectFundDistribution(flow.get(R.FUND).name);
        InvoiceLineEditForm.clickSaveButton();
      },
    );
  });
});
