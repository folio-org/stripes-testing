import {
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  INVOICE_STATUSES,
  NO_VALUE,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  FundDetails,
  Funds,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import UpdateExpenseClassModal from '../../support/fragments/orders/modals/updateExpenseClassModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};

  before('Create test data', () => {
    testData.expenseClasses = {
      first: {
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C700837_ExpenseClass_first_${getRandomPostfix()}`,
      },
      second: {
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C700837_ExpenseClass_second_${getRandomPostfix()}`,
      },
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C700837_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C700837_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C700837_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 100,
      statusExpenseClasses: Object.values(testData.expenseClasses).map(({ id }) => ({
        expenseClassId: id,
      })),
    };
    testData.order = {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    };
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      title: `AT_C700837_OrderLine_${getRandomPostfix()}`,
      listUnitPrice: 5,
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          expenseClassId: testData.expenseClasses.first.id,
          value: 100,
        },
      ],
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);
    Object.values(testData.expenseClasses).forEach((expenseClass) => {
      ExpenseClasses.createExpenseClassViaApi(expenseClass);
    });
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      OrderLines.getOrderLineViaApi({ query: `purchaseOrderId=="${order.id}"` }).then(
        (orderLines) => {
          testData.orderLine = orderLines[0];

          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: testData.fiscalYear.id,
            poLineId: testData.orderLine.id,
            fundDistributions: testData.orderLine.fundDistribution,
            accountingCode: testData.organization.erpCode,
            subTotal: 5,
            releaseEncumbrance: true,
          }).then((invoice) => {
            testData.invoice = invoice;
          });
        },
      );
    });
    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiInvoicesCancelInvoices.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Invoices.deleteInvoiceViaApi(testData.invoice.id, { failOnStatusCode: false });
    Orders.deleteOrderViaApi(testData.order.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C700837 "Update Expense Class" modal appears when changing expense class in PO line with related invoice where releaseEncumbrance=true in invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C700837'] },
    () => {
      // Step 1: Click on the PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          amount: '$5.00',
          initialEncumbrance: '$5.00',
          currentEncumbrance: '$5.00',
        },
      ]);

      // Step 2: Click "Actions" -> "Edit", change expense class to the second one
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.selectExpenseClass(testData.expenseClasses.second.name, 0);
      UpdateExpenseClassModal.verifyModalView();

      // Step 3: Click "Confirm" button
      UpdateExpenseClassModal.clickConfirmButton();
      OrderLineEditForm.checkFundDistributionSection([
        { label: 'expenseClass', conditions: { singleValue: testData.expenseClasses.second.name } },
      ]);

      // Step 4: Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, expenseClass: testData.expenseClasses.second.name },
      ]);

      // Step 5: Navigate to Invoice #1 details pane, click on invoice line
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          currentEncumbrance: '$5.00',
        },
      ]);

      // Step 6: Close invoice line, approve and pay Invoice #1
      Invoices.backToInvoiceDetailsView();
      InvoiceView.approveInvoice();
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Step 7: Click on invoice line in "Invoice line" accordion
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses.first.name,
          currentEncumbrance: '$0.00',
        },
      ]);

      // Step 8: Click on the "Current encumbrance" hyperlink
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.order.poNumber}-1` },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.TO, value: NO_VALUE },
          {
            key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS,
            value: testData.expenseClasses.second.name,
          },
          { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: NO_VALUE },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$5.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$5.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
          { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: NO_VALUE },
        ],
      });

      // Step 9: Navigate to the Fund A details pane, click on the record in "Current budget" accordion
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
      FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkExpenseClassesTableContent([
        {
          name: 'Unassigned',
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
          percentExpended: '0%',
        },
        {
          name: testData.expenseClasses.first.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$5.00',
          percentExpended: '100%',
        },
        {
          name: testData.expenseClasses.second.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
          percentExpended: '0%',
        },
      ]);

      // Step 10: Navigate to Invoice #1 details pane, cancel the invoice
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.cancelInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
      });

      // Step 11: Click on the invoice line record, click on the "Current encumbrance" hyperlink
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '($5.00)' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.order.poNumber}-1` },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          { key: TRANSACTION_DETAIL_FIELDS.TO, value: NO_VALUE },
          {
            key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS,
            value: testData.expenseClasses.second.name,
          },
          { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: NO_VALUE },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$5.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: NO_VALUE },
        ],
      });

      // Step 12: Navigate to the Fund A details pane, click on the record in "Current budget" accordion
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
      FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkExpenseClassesTableContent([
        {
          name: 'Unassigned',
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
          percentExpended: '0%',
        },
        {
          name: testData.expenseClasses.first.name,
          encumbered: '$0.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
          percentExpended: '0%',
        },
        {
          name: testData.expenseClasses.second.name,
          encumbered: '$5.00',
          awaitingPayment: '$0.00',
          expended: '$0.00',
          percentExpended: '0%',
        },
      ]);
    },
  );
});
