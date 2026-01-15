import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  Transactions,
} from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, Orders, OrderLines } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { ORDER_STATUSES, INVOICE_STATUSES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    amount: 90,
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test user', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  beforeEach('Create test data', () => {
    testData.fiscalYear = FiscalYears.getDefaultFiscalYear();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYear.id,
    };
    testData.funds = {
      first: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_001.${new Date().getTime()}`,
        ledgerId: testData.ledger.id,
      },
      second: {
        ...Funds.getDefaultFund(),
        name: `autotest_fund_002.${new Date().getTime()}`,
        ledgerId: testData.ledger.id,
      },
    };
    testData.budgets = {
      first: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: testData.fiscalYear.id,
        fundId: testData.funds.first.id,
      },
      second: {
        ...Budgets.getDefaultBudget(),
        allocated: 100,
        fiscalYearId: testData.fiscalYear.id,
        fundId: testData.funds.second.id,
      },
    };

    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(testData.fiscalYear);
      Ledgers.createViaApi(testData.ledger);
      Object.values(testData.funds).forEach((fund) => {
        Funds.createViaApi(fund);
      });
      Object.values(testData.budgets).forEach((budget) => {
        Budgets.createViaApi(budget);
      });

      testData.order = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      };
      testData.orderLine = BasicOrderLine.getDefaultOrderLine({
        listUnitPrice: testData.amount,
        fundDistribution: [
          { code: testData.funds.first.code, fundId: testData.funds.first.id, value: 100 },
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
              subTotal: testData.amount,
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

    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C368477 Editing fund distribution in PO line when related Paid invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C368477'] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();

      // Select **"Fund B"** from "Fund ID" dropdown in "Fund distribution" accordion
      OrderLineEditForm.updateFundDistribution({ fund: testData.funds.second.name });

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.second.name,
          expenseClass: '',
          value: '100%',
          amount: `$${testData.amount}.00`,
          initialEncumbrance: `$${testData.amount}.00`,
          currentEncumbrance: '$0.00',
        },
      ]);

      // Click "Current encumbrance" link for **"Fund B"** in "Fund distribution" accordion.
      const TransactionDetails = OrderLineDetails.openEncumbrancePane(testData.funds.second.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.funds.second.name },
          { key: 'Initial encumbrance', value: `$${testData.amount}.00` },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: `$${testData.amount}.00` },
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
      Invoices.waitLoading();

      // Click "Vendor invoice number" link for Invoice from Preconditions
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      // "Status" field is "Cancelled"
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
          name: testData.funds.first.name,
          amount: '$0.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);

      // Click on "Fund A" link in "Fund distribution" accordion
      const FundDetails = InvoiceLineDetails.openFundDetailsPane(testData.funds.first.name);

      // Click on "Fund A" budget in "Current budget" accordion
      const BudgetDetails = FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        information: [{ key: 'Name', value: testData.budgets.first.name }],
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
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: `$${testData.amount}.00` },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.funds.first.name },
        ],
      });
    },
  );
});
