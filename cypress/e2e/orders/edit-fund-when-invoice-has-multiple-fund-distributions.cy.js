import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  Transactions,
} from '../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BasicOrderLine, OrderLines, NewOrder, Orders } from '../../support/fragments/orders';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { ORDER_STATUSES, INVOICE_STATUSES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const fiscalYear = FiscalYears.getDefaultFiscalYear();
  const ledger = {
    ...Ledgers.getDefaultLedger(),
    fiscalYearOneId: fiscalYear.id,
  };
  const funds = {
    first: {
      ...Funds.getDefaultFund(),
      name: `autotest_fund_001.${new Date().getTime()}`,
      ledgerId: ledger.id,
    },
    second: {
      ...Funds.getDefaultFund(),
      name: `autotest_fund_002.${new Date().getTime()}`,
      ledgerId: ledger.id,
    },
    third: {
      ...Funds.getDefaultFund(),
      name: `autotest_fund_003.${new Date().getTime()}`,
      ledgerId: ledger.id,
    },
  };
  const budgets = {
    first: {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYear.id,
      fundId: funds.first.id,
    },
    second: {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYear.id,
      fundId: funds.second.id,
    },
    third: {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYear.id,
      fundId: funds.third.id,
    },
  };
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fiscalYear,
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(fiscalYear);
      Ledgers.createViaApi(ledger);
      Object.values(funds).forEach((fund) => {
        Funds.createViaApi(fund);
      });
      Object.values(budgets).forEach((budget) => {
        Budgets.createViaApi(budget);
      });

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          reEncumber: true,
        };
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 100,
          fundDistribution: [
            { code: funds.first.code, fundId: funds.first.id, value: 40 },
            { code: funds.third.code, fundId: funds.third.id, value: 60 },
          ],
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
                subTotal: 100,
                releaseEncumbrance: true,
              }).then((invoice) => {
                testData.invoice = invoice;

                Invoices.changeInvoiceStatusViaApi({
                  invoice: testData.invoice,
                  status: INVOICE_STATUSES.PAID,
                });
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
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C375227 Editing fund distribution in PO line when PO line has more than one fund distributions and related Paid invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C375227'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();

      // Select "Fund B" instead of "Fund A" from "Fund ID" dropdown
      OrderLineEditForm.updateFundDistribution({ fund: funds.second.name, index: 0 });

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: funds.second.name,
          expenseClass: '',
          value: '40%',
          amount: '$40.00',
          initialEncumbrance: '$40.00',
          currentEncumbrance: '$0.00',
        },
        {
          name: funds.third.name,
          expenseClass: '',
          value: '60%',
          amount: '$60.00',
          initialEncumbrance: '$60.00',
          currentEncumbrance: '$0.00',
        },
      ]);

      // Click "Current encumbrance" link for **"Fund B"** in "Fund distribution" accordion.
      const TransactionDetails = OrderLineDetails.openEncumbrancePane(funds.second.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: funds.second.name },
          { key: 'Initial encumbrance', value: '$40.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$40.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      // Close "Encumbrance" pane
      TransactionDetails.closeTransactionDetails();
      Transactions.checkTransactionsList({
        records: [{ type: 'Payment' }],
        present: false,
      });

      // Go to "Invoices" app
      cy.visit(TopMenu.invoicesPath);

      // Click "Vendor invoice number" link for Invoice from Preconditions
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // * "Status" field is "Paid"
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Status', value: INVOICE_STATUSES.PAID },
        ],
      });

      // Click on the invoice line related to PO line
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: funds.first.name,
          amount: '$40.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);

      // Click on "Fund A" link in "Fund distribution" accordion
      const FundDetails = InvoiceLineDetails.openFundDetailsPane(funds.first.name);

      // Click on "Fund A" budget in "Current budget" accordion
      const BudgetDetails = FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        information: [{ key: 'Name', value: budgets.first.name }],
      });

      // Click "View transactions" link in "Budget information" accordion
      BudgetDetails.clickViewTransactionsLink();
      Transactions.checkTransactionsList({
        records: [{ type: 'Encumbrance' }],
        present: false,
      });

      // Search for "Payment" transaction and click on its "Transaction date" link
      Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYear.code },
          { key: 'Amount', value: '$40.00' },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: funds.first.name },
        ],
      });
    },
  );
});
