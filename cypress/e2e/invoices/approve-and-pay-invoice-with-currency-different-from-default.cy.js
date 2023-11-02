import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { Invoices, InvoiceView, InvoiceLineDetails } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../support/fragments/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (orderLines) => {
              testData.orderLine = orderLines[0];

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: true,
                exportToAccounting: true,
              }).then((invoice) => {
                testData.invoice = invoice;
              });
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380406 Approve and pay invoice with currency different from default when "Export to accounting" option is active (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // Click "Vendor invoice number" link for Invoice from Preconditions
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // * "Status" field is "Open"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Status', value: INVOICE_STATUSES.OPEN },
          { key: 'Source', value: 'User' },
        ],
      });

      // Click "Actions" button, Select "Edit" option
      const InvoiceEditForm = InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Select currency different from selected by default, Click "Save & close" button
      InvoiceEditForm.fillInvoiceFields({
        currency: 'UYI (UYI)',
        exchangeRate: '1',
      });
      InvoiceEditForm.clickSaveButton();

      // * Selected currency is displayed in "Invoice information" accordion
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Status', value: INVOICE_STATUSES.OPEN },
          { key: 'Sub-total', value: 'UYI' },
        ],
      });

      // Click "Actions" button, Select "Approve" option, Click "Submit" button
      InvoiceView.approveInvoice();

      // Invoice status is changed to "Approved"
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
      });

      // Click "Actions" button, Select "Pay" option, Click "Submit" button
      InvoiceView.payInvoice();

      // Invoice status is changed to "Paid"
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Click invoice line record on invoice
      InvoiceView.selectInvoiceLine();

      // * Status is "Paid"
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Click on "Fund name" link in "Fund distribution" accordion
      const FundDetails = InvoiceLineDetails.openFundDetailsPane();

      // Click "Actions" button, Select "View transactions for current budget" option
      const Transactions = FundDetails.viewTransactionsForCurrentBudget();

      // Click on "Payment" transaction link
      const TransactionDetails = Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.fund.name },
        ],
      });
    },
  );
});
