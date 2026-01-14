import { INVOICE_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100, allowableEncumbrance: 110 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 110,
          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (orderLines) => {
              testData.orderLine = orderLines[0];

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: false,
              }).then((invoice) => {
                testData.invoice = invoice;
              });
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesCancelInvoices.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C399092 Initial encumbrance amount remains the same as it was before payment after cancelling related paid invoice (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C399092'] },
    () => {
      // Open invoice from precondition
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });

      // Click invoice line record on invoice
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '110.00' },
      ]);

      // Click "Actions" button, Select "Edit" option
      const InvoiceLineEditForm = InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Replace value in "Sub-total" field with "10", Click "Save & close" button
      InvoiceLineEditForm.fillInvoiceLineFields({ subTotal: '10' });
      InvoiceLineEditForm.clickSaveButton();

      // Click "Actions" button, Select "Approve" option, Click "Submit" button
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
      });

      // Click "Actions" button, Select "Pay" option, Click "Submit" button
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Click invoice line record on invoice
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '100.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '100.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '110.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '10.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      // Go back to invoice details pane
      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // Click "Actions" button, Select "Cancel" option, Click "Submit" button
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
      });

      // Click invoice line record on invoice
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '110.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '110.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '110.00' },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
