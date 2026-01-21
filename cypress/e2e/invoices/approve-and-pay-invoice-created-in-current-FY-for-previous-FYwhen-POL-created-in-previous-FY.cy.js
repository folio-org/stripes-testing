import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  FundDetails,
  LedgerRollovers,
  Transactions,
} from '../../support/fragments/finance';
import {
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
  NewInvoice,
} from '../../support/fragments/invoices';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Invoices', { retries: { runMode: 1 } }, () => {
  const isApprovePayEnabled = true;
  const date = new Date();
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    polPrice: '20.00',
    organization,
    expenseClass: ExpenseClasses.getDefaultExpenseClass(),
    order: {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
      reEncumber: true,
      approved: true,
    },
    ledger: {},
    fundA: {},
    budgetForFundA: {},
    user: {},
    invoice: { ...NewInvoice.defaultUiInvoice },
  };
  const code = CodeTools(4);
  const fiscalYears = {
    first: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      periodStart: DateTools.getCurrentDateForFiscalYear(),
      periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
    },
    second: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      periodStart: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(3),
      periodEnd: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(5),
    },
  };

  before(() => {
    cy.getAdminToken().then(() => {
      cy.getBatchGroups().then((batchGroup) => {
        testData.invoice.batchGroup = batchGroup.name;
      });
      ExpenseClasses.createExpenseClassViaApi(testData.expenseClass);

      const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: fiscalYears.first,
        ledger: { restrictExpenditures: true },
        budget: {
          allocated: 100,
          statusExpenseClasses: [
            {
              status: 'Active',
              expenseClassId: testData.expenseClass.id,
            },
          ],
        },
      });
      testData.ledger = ledger;
      testData.fundA = fund;
      testData.budgetForFundA = budget;

      FiscalYears.createViaApi(fiscalYears.second);
      Organizations.createOrganizationViaApi(organization).then((orgResp) => {
        testData.invoice.accountingCode = organization.erpCode;

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
                const orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 20.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 20.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fundA.code,
                      fundId: testData.fundA.id,
                      value: 100,
                      expenseClassId: testData.expenseClass.id,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp,
                    volumes: [],
                  },
                };

                Orders.createOrderViaApi(testData.order).then((orderResp) => {
                  testData.order.id = orderResp.id;
                  testData.orderNumber = orderResp.poNumber;
                  orderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(orderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });
            });
          },
        );
      });
      Approvals.setApprovePayValue(isApprovePayEnabled);

      const rollover = LedgerRollovers.generateLedgerRollover({
        ledger: testData.ledger,
        fromFiscalYear: fiscalYears.first,
        toFiscalYear: fiscalYears.second,
      });

      LedgerRollovers.createLedgerRolloverViaApi(rollover);
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.first,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 2, 0, 1),
        periodEnd: new Date(date.getFullYear() - 2, 11, 31),
      });
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.second,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 1, 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      });

      Budgets.getBudgetByIdViaApi(testData.budgetForFundA.id).then((resp) => {
        Budgets.updateBudgetViaApi({ ...resp, budgetStatus: 'Active' });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C396361 Approve and pay invoice created in current FY for previous FY when related order line was created in previous Fiscal Year (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C396361'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(testData.invoice, fiscalYears.first.code);
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Fiscal year', value: fiscalYears.first.code }],
        invoiceLines: [
          {
            poNumber: `${testData.orderNumber}-1`,
          },
        ],
      });
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled });
      ApproveInvoiceModal.clickSubmitButton({ isApprovePayEnabled });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
        invoiceLines: [
          {
            receiptStatus: 'Ongoing',
            paymentStatus: 'Ongoing',
          },
        ],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, currentEncumbrance: '0.00' },
      ]);
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: testData.polPrice },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: testData.polPrice },
          { key: 'Status', value: 'Released' },
        ],
      });
      Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: `$${testData.polPrice}` },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Expense class', value: testData.expenseClass.name },
        ],
      });
      Transactions.closeTransactionsPage();
      BudgetDetails.waitLoading();
      BudgetDetails.checkBudgetDetails({
        information: [
          { key: 'Name', value: testData.budgetForFundA.name },
          { key: 'Status', value: 'Active' },
          { key: 'Allowable expenditure', value: '100%' },
          { key: 'Allowable encumbrance', value: '100%' },
        ],
      });
      BudgetDetails.closeBudgetDetails();
      FundDetails.waitLoading();
      FundDetails.checkFundDetails({
        information: [
          { key: 'Name', value: testData.fundA.name },
          { key: 'Code', value: testData.fundA.code },
          { key: 'Ledger', value: testData.ledger.name },
          { key: 'Status', value: 'Active' },
        ],
        currentBudget: {
          name: fiscalYears.second.code,
          allocated: '100.00',
        },
        previousBudgets: [
          {
            name: testData.budgetForFundA.name,
            allocated: '100.00',
          },
        ],
      });
      const CurrentBudgetDetails = FundDetails.openCurrentBudgetDetails();
      CurrentBudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Expended', value: '$0.00' }],
      });
      CurrentBudgetDetails.clickViewTransactionsLink();
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: `$${testData.polPrice}` },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fundA.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: testData.polPrice },
          { key: 'Awaiting payment', value: '0.00' },
          { key: 'Expended', value: '0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
