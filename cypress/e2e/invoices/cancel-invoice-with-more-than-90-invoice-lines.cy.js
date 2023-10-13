import { DevTeams, TestTypes, Permissions, Parallelization } from '../../support/dictionary';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { Budgets } from '../../support/fragments/finance';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../support/fragments/orders';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import { INVOICE_STATUSES, VOUCHER_STATUSES } from '../../support/constants';
import Transactions from '../../support/fragments/finance/transactions/transactions';

describe('Invoices', () => {
  const orderLinesCount = 3;
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    orderLines: [],
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimit(orderLinesCount + 1);

      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        Orders.createOrderViaApi(testData.order)
          .then((order) => {
            testData.order = order;

            cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
              const acquisitionMethod = body.acquisitionMethods[0].id;
              [...Array(orderLinesCount).keys()].forEach(() => {
                const props = BasicOrderLine.getDefaultOrderLine({
                  acquisitionMethod,
                  purchaseOrderId: testData.order.id,
                  listUnitPrice: 1,
                  fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
                });
                OrderLines.createOrderLineViaApi(props).then((orderLine) => {
                  testData.orderLines.push(orderLine);
                });
              });
            });

            Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
          })
          .then(() => {
            Invoices.createInvoiceViaApi({
              vendorId: testData.organization.id,
              fiscalYearId: testData.fiscalYear.id,
              accountingCode: testData.organization.erpCode,
            }).then((invoice) => {
              testData.invoice = invoice;

              OrderLines.getOrderLineViaApi({
                query: `poLineNumber=="*${testData.order.poNumber}*"`,
              }).then((orderLines) => {
                orderLines.forEach((orderLine) => {
                  const invoiceLine = Invoices.getDefaultInvoiceLine({
                    invoiceId: testData.invoice.id,
                    invoiceLineStatus: testData.invoice.status,
                    poLineId: orderLine.id,
                    fundDistributions: orderLine.fundDistribution,
                    accountingCode: testData.organization.erpCode,
                  });
                  Invoices.createInvoiceLineViaApi(invoiceLine);
                });
              });

              Invoices.approveInvoiceViaApi({ invoice: testData.invoice });
            });
          });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesCancelInvoices.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    OrderLinesLimit.setPOLLimit(1);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375062 Cancel invoice with more than 90 invoice lines (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet, Parallelization.nonParallel] },
    () => {
      // Click on Invoice number link for Invoice from Precondition
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // * "Status" field in "Invoice information" accordion is "Approved"
      // * Total number of invoice lines is equal to number of PO lines from Precondition
      // * "Status" field in "Voucher information" accordion is "Awaiting payment"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Status', value: INVOICE_STATUSES.APPROVED },
        ],
        voucherInformation: [{ key: 'Status', value: VOUCHER_STATUSES.AWAITING_PAYMENT }],
      });
      InvoiceView.checkInvoiceLinesCount(orderLinesCount);

      // Click "Actions" button, Select "Cancel" option, Click "Submit" button
      InvoiceView.cancelInvoice();

      // * "Status" field in "Invoice information" accordion is "Cancelled"
      // * "Status" field in "Voucher information" accordion is "Cancelled"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
        voucherInformation: [{ key: 'Status', value: VOUCHER_STATUSES.CANCELLED }],
      });

      // Click on any invoice line in "Invoice lines" accordion
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
        fundDistribution: {
          amount: 0,
          initial: 1,
          encumbrance: 1,
        },
      });

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails([
        { key: 'Fiscal year', value: testData.fiscalYear.code },
        { key: 'Amount', value: '0.00' },
        { key: 'Source', value: testData.orderLines[0].poLineNumber },
        { key: 'Type', value: 'Encumbrance' },
        { key: 'From', value: testData.fund.name },
        { key: 'Initial encumbrance', value: '98.00' },
        { key: 'Awaiting payment', value: '0.00' },
        { key: 'Expended', value: '0.00' },
        { key: 'Status', value: 'Unreleased' },
      ]);

      // Close "Encumbrance" pane by clicking "X" button on the top left of the pane
      TransactionDetails.closeTransactionDetails();
      Transactions.checkTableContent({
        records: [
          ...[...Array(orderLinesCount)].map(() => ({ type: 'Pending payment', amount: '0.00' })),
          ...[...Array(orderLinesCount)].map(() => ({ type: 'Encumbrance', amount: '1.00' })),
        ],
        skipRow: 'Allocation',
      });

      // Click on any link for "Pending payment" transaction related to invoice line from Preconditions
      Transactions.selectFirstTransaction('Pending payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Pending payment' },
          { key: 'From', value: testData.fund.name },
        ],
      });

      // Click "Info" icon next to "Amount" crossed value
      TransactionDetails.showInfoTooltip({ key: 'Amount', text: 'Voided transaction' });
    },
  );
});
