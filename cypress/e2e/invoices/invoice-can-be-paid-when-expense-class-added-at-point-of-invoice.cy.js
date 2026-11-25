import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  INVOICE_BATCH_GROUPS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FundDetails,
  Funds,
  TransactionDetails,
  Transactions,
} from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
} from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import { DateTools } from '../../support/utils';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import InteractorsTools from '../../support/utils/interactorsTools';
import FinanceStates from '../../support/fragments/finance/states';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UpdateExpenseClassModal from '../../support/fragments/orders/modals/updateExpenseClassModal';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    expenseClass: ExpenseClasses.getDefaultExpenseClass(),
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNo: `AT_C357553_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
    fund: {},
    budget: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createExpenseClass = () => {
    return ExpenseClasses.createExpenseClassViaApi(testData.expenseClass);
  };

  // The budget has no expense classes
  const createFinanceData = () => {
    const { fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 1000 },
    });

    testData.fund = fund;
    testData.budget = budget;
  };

  const fetchReferenceData = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            listUnitPrice: 100,
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewEditFundAndBudget.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiOrdersEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
        FinanceHelper.searchByName(testData.fund.name);
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);

    createOrganization()
      .then(createExpenseClass)
      .then(createFinanceData)
      .then(fetchReferenceData)
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C357553 Invoice can be paid when expense class added at point of invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357553'] },
    () => {
      // Step 1: Click on the Fund name
      Funds.selectFund(testData.fund.name);
      FundDetails.waitLoading();

      // Step 2: Click on the budget name in "Current budget" accordion
      Funds.selectBudgetDetails();
      BudgetDetails.waitLoading();

      // Steps 3-5: Edit the budget, add expense class and click "Save & close" button
      Funds.editBudget();
      Funds.addExpensesClass(testData.expenseClass.name);
      InteractorsTools.checkCalloutMessage(
        FinanceStates.budgetSavedSuccessfully(testData.budget.name),
      );
      BudgetDetails.waitLoading();
      BudgetDetails.checkExpenseClassesTableContent([{ name: testData.expenseClass.name }]);

      // Step 6: Go to "Invoices" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();

      // Steps 7-8: Create an invoice for the vendor from the order
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.fillInvoiceFields({
        ...testData.invoice,
        vendorName: testData.organization.name,
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 9: Click "Actions" button in "Invoice lines" accordion, select "Add line from POL" option
      InvoiceView.openSelectOrderLineModal();

      // Step 10: Search for the PO line, check it and click "Save" button
      SelectOrderLinesModal.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        testData.orderLine.poLineNumber,
      );
      SelectOrderLinesModal.selectOrderLineByNumber(testData.orderLine.poLineNumber);
      SelectOrderLinesModal.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceLines: [{ poNumber: testData.orderLine.poLineNumber }],
      });

      // Step 11: Click on the invoice line
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        checkboxes: [
          {
            locator: { labelText: INVOICE_LINE_VIEW_FIELDS.RELEASE_ENCUMBRANCE },
            conditions: { disabled: true, checked: true },
          },
        ],
      });

      // Step 12: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.waitLoading();

      // Step 13: Select the expense class in "Fund distribution" accordion, click "Save & close" button
      InvoiceLineEditForm.selectExpenseClass(testData.expenseClass.name);
      InvoiceLineEditForm.clickSaveButton();

      // Steps 14-15: Approve the invoice
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Step 16: Go to "Orders" app, search for the order and click on it
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.selectOrderByPONumber(testData.order.poNumber);

      // Step 17: Click on the PO line in "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();

      // Steps 18-19: Edit the PO line, select the expense class and click "Save & close" button
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.selectExpenseClass(testData.expenseClass.name, 0);
      UpdateExpenseClassModal.verifyModalView();
      UpdateExpenseClassModal.clickConfirmButton();
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();

      // Step 20: Go back to "Invoices" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);

      // Steps 21-22: Pay the invoice
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 23: Click on the invoice line
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();

      // Step 24: Click on the "Current encumbrance" link
      InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.orderLine.poLineNumber },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });

      // Step 25: Click on the "Payment" transaction on "Transactions" pane
      TransactionDetails.closeTransactionDetails();
      Transactions.selectTransaction(TRANSACTION_TYPES.PAYMENT);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$100.00' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: testData.invoice.vendorInvoiceNo },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.PAYMENT },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: testData.expenseClass.name },
        ],
      });
    },
  );
});
