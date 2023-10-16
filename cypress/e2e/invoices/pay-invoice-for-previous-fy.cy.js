import { DevTeams, TestTypes, Permissions, Parallelization } from '../../support/dictionary';
import {
  Budgets,
  BudgetDetails,
  FundDetails,
  FiscalYears,
  LedgerRollovers,
} from '../../support/fragments/finance';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import {
  Invoices,
  InvoiceView,
  InvoiceLineDetails,
  InvoiceEditForm,
} from '../../support/fragments/invoices';
import { Transactions } from '../../support/fragments/finance/transactions';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { DateTools, StringTools, CodeTools } from '../../support/utils';
import { INVOICE_STATUSES, ORDER_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const isApprovePayEnabled = true;
  const date = new Date();

  const prepareTestData = (testData, fiscalYears) => {
    cy.getAdminToken()
      .then(() => {
        FiscalYears.createViaApi(fiscalYears.next);
        ExpenseClasses.createExpenseClassViaApi(testData.expenseClass);

        const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          fiscalYear: fiscalYears.prev,
          ledger: { restrictExpenditures: true },
          budget: { allocated: 100 },
          expenseClasses: [testData.expenseClass],
        });

        testData.ledger = ledger;
        testData.fund = fund;
        testData.budget = budget;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getBatchGroups().then(({ id: batchGroupId, name: batchGroupName }) => {
            testData.invoice = Invoices.getDefaultInvoice({
              batchGroupId,
              batchGroupName,
              vendorId: testData.organization.id,
              vendorName: testData.organization.name,
              accountingCode: testData.organization.erpCode,
              invoiceDate: DateTools.getCurrentDate(),
            });
          });

          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 100,
            fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            },
          );
        });
      })
      .then(() => {
        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: fiscalYears.prev,
          toFiscalYear: fiscalYears.next,
        });
        LedgerRollovers.createLedgerRolloverViaApi(rollover);
      })
      .then(() => {
        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.prev,
          _version: 1,
          periodStart: new Date(date.getFullYear(), 0, 1),
          periodEnd: new Date(date.getFullYear(), date.getMonth(), date.getDay() - 2),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.next,
          _version: 1,
          periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDay() - 1),
          periodEnd: new Date(date.getFullYear() + 1, 11, 31),
        });

        Budgets.getBudgetByIdViaApi(testData.budget.id).then((resp) => {
          Budgets.updateBudgetViaApi({ ...resp, budgetStatus: 'Active' });
        });
      });
  };

  const prepareTestUser = (testData, permissions = []) => {
    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiOrdersView.gui,
      ...permissions,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  };

  before('Enable "Approve and pay in one click" option', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValue(isApprovePayEnabled);
  });

  after('Disable "Approve and pay in one click" option', () => {
    Approvals.setApprovePayValue(false);
  });

  describe('"Invoice: Pay invoices in a different fiscal year" permission is assigned to a user', () => {
    const code = CodeTools(4);
    const fiscalYears = {
      prev: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
      order: {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
        reEncumber: true,
      },
      expenseClass: ExpenseClasses.getDefaultExpenseClass(),
      invoice: {},
      user: {},
    };

    beforeEach('Create test data', () => {
      prepareTestData(testData, fiscalYears);
      prepareTestUser(testData, [Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui]);
    });

    afterEach('Delete test data', () => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C388520 Approve and pay invoice created in current FY for previous FY when related order line was created in previous FY (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet, Parallelization.nonParallel] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions" button, Select "New invoice" option, Click "Submit" button
        OrderDetails.createNewInvoice();

        // * "Create vendor invoice" page appears
        // * "Vendor name" field is not editable and contains vendor name from related order
        InvoiceEditForm.checkButtonsConditions([
          {
            label: 'Vendor name',
            conditions: { disabled: true, value: testData.invoice.vendorName },
          },
        ]);

        // Fill the following fields: "Invoice date" - Today, "Fiscal year" - select previous "Fiscal year #1"
        InvoiceEditForm.fillInvoiceFields({
          invoiceDate: testData.invoice.invoiceDate,
          fiscalYear: fiscalYears.prev.code,
          batchGroupName: testData.invoice.batchGroupName,
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          paymentMethod: testData.invoice.paymentMethod,
        });

        // Click "Save & close" button
        InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });

        // Fiscal year" field is specified with previous "Fiscal year #1"
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: 'Status', value: INVOICE_STATUSES.OPEN },
            { key: 'Fiscal year', value: fiscalYears.prev.code },
          ],
          invoiceLines: [
            {
              poNumber: testData.order.poNumber,
              description: testData.orderLine.titleOrPackage,
            },
          ],
        });

        // Click "Actions" button, Select "Approve & pay" option, Click "Submit" button
        InvoiceView.approveInvoice({ isApprovePayEnabled });

        // * Invoice status is changed to "Paid"
        // * "Receipt status" and "Payment status" are specified as "Ongoing"
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: 'Status', value: INVOICE_STATUSES.PAID },
            { key: 'Fiscal year', value: fiscalYears.prev.code },
          ],
          invoiceLines: [
            {
              poNumber: testData.order.poNumber,
              description: testData.orderLine.titleOrPackage,
              receiptStatus: 'Ongoing',
              paymentStatus: 'Ongoing',
            },
          ],
        });

        // Click on invoice line record in "Invoice lines" accordion
        InvoiceView.selectInvoiceLine();

        // * "Current encumbrance" field in "Fund distribution" accordion contains a link with "0.00" value
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            encumbrance: '0.00',
          },
        ]);

        // Click "Current encumbrance" link in "Fund distribution" accordion
        const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.prev.code },
            { key: 'Amount', value: '0.00' },
            { key: 'Source', value: testData.order.poNumber },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '100.00' },
            { key: 'Awaiting payment', value: '0.00' },
            { key: 'Expended', value: '100.00' },
            { key: 'Status', value: 'Released' },
          ],
        });

        // Search for "Payment" transaction and click on its "Transaction date" link
        Transactions.selectTransaction('Payment');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.prev.code },
            { key: 'Amount', value: '100.00' },
            { key: 'Source', value: testData.invoice.vendorInvoiceNo },
            { key: 'Type', value: 'Payment' },
            { key: 'From', value: testData.fund.name },
          ],
        });

        // Close "Transactions" page
        Transactions.closeTransactionsPage();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: testData.budget.name },
            { key: 'Status', value: 'Active' },
            { key: 'Allowable expenditure', value: '100%' },
            { key: 'Allowable encumbrance', value: '100%' },
          ],
        });

        // Close "Fund A-Fiscal year #1" page by clicking on "X" button on the top left of the page
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          information: [
            { key: 'Name', value: testData.fund.name },
            { key: 'Code', value: testData.fund.code },
            { key: 'Ledger', value: testData.ledger.name },
            { key: 'Status', value: 'Active' },
          ],
          currentBudget: {
            name: fiscalYears.next.code,
            allocated: '100.00',
          },
          previousBudgets: [
            {
              name: testData.budget.name,
              allocated: '100.00',
            },
          ],
        });

        // Click on the record in "Current budget" accordion
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: fiscalYears.next.code },
            { key: 'Status', value: 'Active' },
            { key: 'Allowable expenditure', value: '100%' },
            { key: 'Allowable encumbrance', value: '100%' },
          ],
        });

        // Click "View transactions" link in "Budget information" accordion
        BudgetDetails.clickViewTransactionsLink();

        // Search for "Encumbrance" transaction and click on its "Transaction date" link
        Transactions.selectTransaction('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.next.code },
            { key: 'Amount', value: '100.00' },
            { key: 'Source', value: testData.order.poNumber },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '100.00' },
            { key: 'Awaiting payment', value: '0.00' },
            { key: 'Expended', value: '0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
      },
    );
  });

  describe('"Invoice: Pay invoices in a different fiscal year" permission is NOT assigned to a user', () => {
    const code = CodeTools(4);
    const fiscalYears = {
      prev: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
      },
      next: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
      order: {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
        reEncumber: true,
      },
      expenseClass: ExpenseClasses.getDefaultExpenseClass(),
      invoice: {},
      user: {},
    };

    beforeEach('Create test data', () => {
      prepareTestData(testData, fiscalYears);
      prepareTestUser(testData);
    });

    afterEach('Delete test data', () => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C388545 Approve and pay invoice created in current FY when related order line was created in previous FY and user does not have "Invoice: Pay invoices in a different fiscal year" permission (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet, Parallelization.nonParallel] },
      () => {
        // Click on "PO number" link on "Orders" pane
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions" button, Select "New invoice" option, Click "Submit" button
        OrderDetails.createNewInvoice();

        // * "Create vendor invoice" page appears
        // * "Vendor name" field is not editable and contains vendor name from related order
        InvoiceEditForm.checkButtonsConditions([
          {
            label: 'Vendor name',
            conditions: { disabled: true, value: testData.invoice.vendorName },
          },
        ]);

        // Fill the following fields: "Invoice date" - Today, "Fiscal year" - not sets
        InvoiceEditForm.fillInvoiceFields({
          invoiceDate: testData.invoice.invoiceDate,
          batchGroupName: testData.invoice.batchGroupName,
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          paymentMethod: testData.invoice.paymentMethod,
        });

        // Click "Save & close" button
        InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });

        // Fiscal year" field is specified with previous "Fiscal year #1"
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: 'Status', value: INVOICE_STATUSES.OPEN },
            { key: 'Fiscal year', value: fiscalYears.next.code },
          ],
          invoiceLines: [
            {
              poNumber: testData.order.poNumber,
              description: testData.orderLine.titleOrPackage,
            },
          ],
        });

        // Click "Actions" button, Select "Approve & pay" option, Click "Submit" button
        InvoiceView.approveInvoice({ isApprovePayEnabled });

        // * Invoice status is changed to "Paid"
        // * "Receipt status" and "Payment status" are specified as "Ongoing"
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: 'Status', value: INVOICE_STATUSES.PAID },
            { key: 'Fiscal year', value: fiscalYears.next.code },
          ],
          invoiceLines: [
            {
              poNumber: testData.order.poNumber,
              description: testData.orderLine.titleOrPackage,
              receiptStatus: 'Ongoing',
              paymentStatus: 'Ongoing',
            },
          ],
        });

        // Click on invoice line record in "Invoice lines" accordion
        InvoiceView.selectInvoiceLine();

        // * "Current encumbrance" field in "Fund distribution" accordion contains a link with "0.00" value
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            encumbrance: '0.00',
          },
        ]);

        // Click "Current encumbrance" link in "Fund distribution" accordion
        const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.next.code },
            { key: 'Amount', value: '0.00' },
            { key: 'Source', value: testData.order.poNumber },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '100.00' },
            { key: 'Awaiting payment', value: '0.00' },
            { key: 'Expended', value: '100.00' },
            { key: 'Status', value: 'Released' },
          ],
        });

        // Search for "Payment" transaction and click on its "Transaction date" link
        Transactions.selectTransaction('Payment');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.next.code },
            { key: 'Amount', value: '100.00' },
            { key: 'Source', value: testData.invoice.vendorInvoiceNo },
            { key: 'Type', value: 'Payment' },
            { key: 'From', value: testData.fund.name },
          ],
        });

        // Close "Transactions" page
        Transactions.closeTransactionsPage();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: fiscalYears.next.code },
            { key: 'Status', value: 'Active' },
            { key: 'Allowable expenditure', value: '100%' },
            { key: 'Allowable encumbrance', value: '100%' },
          ],
        });

        // Close "Fund A-Fiscal year #1" page by clicking on "X" button on the top left of the page
        BudgetDetails.closeBudgetDetails();
        FundDetails.checkFundDetails({
          information: [
            { key: 'Name', value: testData.fund.name },
            { key: 'Code', value: testData.fund.code },
            { key: 'Ledger', value: testData.ledger.name },
            { key: 'Status', value: 'Active' },
          ],
          currentBudget: {
            name: fiscalYears.next.code,
            allocated: '100.00',
          },
          previousBudgets: [
            {
              name: testData.budget.name,
              allocated: '100.00',
            },
          ],
        });

        // Click on the record in "Previous budget" accordion
        FundDetails.openPreviousBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          information: [
            { key: 'Name', value: testData.budget.name },
            { key: 'Status', value: 'Active' },
            { key: 'Allowable expenditure', value: '100%' },
            { key: 'Allowable encumbrance', value: '100%' },
          ],
        });

        // Click "View transactions" link in "Budget information" accordion
        BudgetDetails.clickViewTransactionsLink();

        // Search for "Encumbrance" transaction and click on its "Transaction date" link
        Transactions.selectTransaction('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYears.prev.code },
            { key: 'Amount', value: '100.00' },
            { key: 'Source', value: testData.order.poNumber },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '100.00' },
            { key: 'Awaiting payment', value: '0.00' },
            { key: 'Expended', value: '0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
      },
    );
  });
});
