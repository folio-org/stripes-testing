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
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const updateInvoiceStatusAndLogin = ({ invoice, status }) => {
    Invoices.changeInvoiceStatusViaApi({ invoice, status });

    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
      authRefresh: true,
    });
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

      testData.organization = NewOrganization.getDefaultOrganization();

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
              testData.invoices = [];

              const invoiceData = {
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: false,
              };

              Invoices.createInvoiceWithInvoiceLineViaApi({
                ...invoiceData,
                subTotal: 10,
              }).then((invoice) => {
                testData.invoices.push(invoice);

                Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
              });

              Invoices.createInvoiceWithInvoiceLineViaApi({
                ...invoiceData,
                subTotal: 30,
              }).then((invoice) => {
                testData.invoices.push(invoice);
              });
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesCancelInvoices.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C400614 Initial encumbrance amount remains the same as it was before payment after cancelling related paid invoice (another related approved invoice exists) (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C400614'] },
    () => {
      updateInvoiceStatusAndLogin({
        invoice: testData.invoices[1],
        status: INVOICE_STATUSES.APPROVED,
      });

      // Search invoice in the table
      Invoices.searchByNumber(testData.invoices[0].vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoices[0].vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Click "Actions" button, Select "Cancel" option, Click "Submit" button
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
      });

      // Click invoice line record on invoice
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '80.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '80.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '110.00' },
          { key: 'Awaiting payment', value: '30.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
