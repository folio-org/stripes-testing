import { Permissions } from '../../support/dictionary';
import { Budgets, FundDetails } from '../../support/fragments/finance';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES, INVOICE_STATUSES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelper from '../../support/fragments/finance/financeHelper';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          reEncumber: true,
        };
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });

          OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
            (orderLines) => {
              testData.orderLine = orderLines[0];

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                poLineId: testData.orderLine.id,
                fundDistributions: testData.orderLine.fundDistribution,
                accountingCode: testData.organization.erpCode,
                invoiceStatus: INVOICE_STATUSES.REVIEWED,
                releaseEncumbrance: true,
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
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C374191 Deleting fund distribution in PO line when related Reviewed invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374191'] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: 'Payment status', value: 'Awaiting Payment' },
          { key: 'Receipt status', value: 'Awaiting Receipt' },
        ],
      });

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();

      // Delete fund distribution by clicking "Trash" icon in "Fund distribution" accordion
      OrderLineEditForm.deleteFundDistribution();

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent();

      // Open "Fund A" details pane
      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelper.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      // Click on "Fund A Budget" in "Current budget" accordion
      const BudgetDetails = FundDetails.openCurrentBudgetDetails();

      // Click "View transactions" link in "Budget information" accordion
      const Transactions = BudgetDetails.clickViewTransactionsLink();
      Transactions.checkTransactionsList({
        records: [{ type: 'Encumbrance' }],
        present: false,
      });

      // Open "Invoice" details pane
      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.REVIEWED }],
        invoiceLines: [
          {
            poNumber: testData.order.poNumber,
            fundCode: testData.fund.code,
          },
        ],
      });

      // Click on the invoice line related to PO line
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.code,
          expenseClass: '-',
          currentEncumbrance: '-',
          initialEncumbrance: '-',
        },
      ]);
    },
  );
});
