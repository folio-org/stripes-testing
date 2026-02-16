import { INVOICE_STATUSES, ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  FundDetails,
  LedgerRollovers,
} from '../../support/fragments/finance';
import { Transactions } from '../../support/fragments/finance/transactions';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
} from '../../support/fragments/invoices';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Invoices', { retries: { runMode: 1 } }, () => {
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
          periodEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYears.next,
          _version: 1,
          periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
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
      Permissions.invoiceSettingsAll.gui,
      ...permissions,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
      });
      SettingsInvoices.checkApproveAndPayCheckboxIfNeeded();
      cy.visit(TopMenu.ordersPath);
    });
  };

  before('Enable "Approve and pay in one click" option', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
  });

  describe(
    '"Invoice: Pay invoices in a different fiscal year" permission is assigned to a user',
    { retries: { runMode: 1 } },
    () => {
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
        cy.getAdminToken().then(() => {
          Organizations.deleteOrganizationViaApi(testData.organization.id);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C388520 Approve and pay invoice created in current FY for previous FY when related order line was created in previous FY (thunderjet) (TaaS)',
        { tags: ['criticalPath', 'thunderjet', 'C388520'] },
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
          InvoiceView.waitLoading();
          cy.wait(1500);

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
          InvoiceView.waitLoading();
          cy.wait(1500);

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
          InvoiceView.selectInvoiceLine().waitLoading();

          // * "Current encumbrance" field in "Fund distribution" accordion contains a link with "0.00" value
          InvoiceLineDetails.checkFundDistibutionTableContent([
            {
              name: testData.fund.name,
              currentEncumbrance: '0.00',
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
          BudgetDetails.waitLoading();
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
          FundDetails.waitLoading();
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
    },
  );
});
