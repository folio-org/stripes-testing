import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  LedgerRollovers,
  Ledgers,
  Transactions,
} from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, NewInvoice } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';

describe('Invoices', () => {
  const isApprovePayEnabled = false;
  const code = CodeTools(2);
  const date = new Date();
  const organization = NewOrganization.getDefaultOrganization({ isVendor: true });
  const testData = {
    polPrice: '25.00',
    allocatedQuantity: '100',
    organization,
    expenseClass: ExpenseClasses.getDefaultExpenseClass(),
    order: {
      ...NewOrder.defaultOneTimeOrder,
      vendor: organization.id,
      reEncumber: true,
      approved: true,
    },
    orderLine: {},
    ledger: {},
    fund: {},
    budget: {},
    user: {},
    invoice: { ...NewInvoice.defaultUiInvoice, vendorName: organization.name },
  };
  const randomNumber = StringTools.randomTwoDigitNumber();
  const fiscalYears = {
    first: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}01`,
      periodStart: new Date(), // Feb 4, 2026
      periodEnd: new Date(date.getFullYear(), 11, 31), // Dec 31, 2026
    },
    second: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}02`,
      periodStart: new Date(date.getFullYear() + 1, 0, 1), // Jan 1, 2027
      periodEnd: new Date(date.getFullYear() + 1, 11, 31), // Dec 31, 2027
    },
    third: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${randomNumber}03`,
      periodStart: new Date(date.getFullYear() + 2, 0, 1), // Jan 1, 2028
      periodEnd: new Date(date.getFullYear() + 2, 11, 31), // Dec 31, 2028
    },
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      cy.getBatchGroups().then((batchGroup) => {
        testData.invoice.batchGroup = batchGroup.name;
      });
      ExpenseClasses.createExpenseClassViaApi(testData.expenseClass);

      const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: fiscalYears.first,
        ledger: { restrictExpenditures: false, restrictEncumbrance: false },
        budget: {
          allocated: 10,
          statusExpenseClasses: [
            {
              status: 'Active',
              expenseClassId: testData.expenseClass.id,
            },
          ],
        },
      });
      testData.ledger = ledger;
      testData.fund = fund;
      testData.budget = budget;

      FiscalYears.createViaApi(fiscalYears.second);
      FiscalYears.createViaApi(fiscalYears.third);
      Organizations.createOrganizationViaApi(organization).then((orgResp) => {
        organization.id = orgResp;
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
                    listUnitPrice: 25.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 25.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
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
                  testData.order = orderResp;
                  testData.orderNumber = orderResp.poNumber;
                  orderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    testData.orderLine = orderLineResponse;
                  });
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
      const rollover = LedgerRollovers.generateLedgerRollover({
        ledger: testData.ledger,
        fromFiscalYear: fiscalYears.first,
        toFiscalYear: fiscalYears.second,
        needCloseBudgets: false,
        budgetsRollover: [
          {
            rolloverAllocation: true,
            rolloverBudgetValue: 'None',
            addAvailableTo: 'Allocation',
          },
        ],
        encumbrancesRollover: [{ orderType: 'One-time', basedOn: 'InitialAmount' }],
      });
      LedgerRollovers.createLedgerRolloverViaApi({
        ...rollover,
        restrictEncumbrance: false,
      });
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.first,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 1, 0, 1), // Jan 1, 2025
        periodEnd: new Date(date.getFullYear() - 1, 11, 31), // Dec 31, 2025
      });
      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.second,
        _version: 1,
        periodStart: new Date(), // Feb 4, 2026
        periodEnd: fiscalYears.second.periodEnd, // Dec 31, 2027
      });
      Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
    });

    cy.createTempUser([
      Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceViewLedger.gui,
      Permissions.uiFinanceViewEditFiscalYear.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C388645 Save invoice fiscal year after fund distribution change if FY was undefined and pay invoice against previous FY (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C388645'] },
    () => {
      Invoices.createDefaultInvoiceWithoutAddress(testData.invoice);
      Invoices.checkCreatedInvoice({
        ...testData.invoice,
        information: { fiscalYear: 'No value set', status: 'Open' },
      });
      Invoices.createInvoiceLineFromPol(testData.orderNumber, 0);
      Invoices.checkCreatedInvoice({
        ...testData.invoice,
        information: { fiscalYear: fiscalYears.second.code, status: 'Open' },
      });
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '0.00' },
      ]);
      const TransactionDetails = InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$25.00' },
          { key: 'Awaiting payment', value: '$25.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
      Transactions.selectTransaction('Pending payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: '$25.00' },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: 'Pending payment' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
        ],
      });
      Transactions.closeTransactionsPage();
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
          name: fiscalYears.second.code,
          allocated: '$10.00',
        },
        previousBudgets: [
          {
            name: testData.budget.name,
            allocated: '$10.00',
          },
        ],
      });
      FundDetails.openPreviousBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [{ key: 'Awaiting payment', value: '$0.00' }],
        information: [{ key: 'Name', value: `${testData.budget.name}` }],
      });
      BudgetDetails.clickViewTransactionsLink();
      ['Allocation', 'Encumbrance'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: true,
        });
      });
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '($25.00)' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$25.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      // Change "Period Start Date (UTC)" and "Period End Date (UTC)" fields to any date in the past (should be after "Period End Date (UTC)" for the first fiscal year)
      DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
      const periodStartForFirstFY2 = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear(), 0, 1) }, // Jan 1, 2026
        'MM/DD/YYYY',
      );
      const periodEndForFirstFY2 = DateTools.getFormattedDate(
        { date: new Date(date.getFullYear(), 1, 3) }, // Feb 3, 2026
        'MM/DD/YYYY',
      );
      // Change "Period Start Date (UTC)" and "Period End Date (UTC)" fields to any date including current date (should be after "Period End Date (UTC)" for the second fiscal year)
      const periodStartForThirdFY = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const periodEndForThirdFY = DateTools.getFormattedDate(
        { date: fiscalYears.third.periodEnd }, // Dec 31, 2028
        'MM/DD/YYYY',
      );

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelper.selectLedgersNavigation();
      FinanceHelper.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.rollover();
      Ledgers.fillInRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
        fiscalYears.third.code,
        'None',
        'Allocation',
        true,
      );

      FinanceHelper.selectFiscalYearsNavigation();
      FinanceHelper.searchByName(fiscalYears.second.name);
      FiscalYears.selectFY(fiscalYears.second.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForFirstFY2,
        periodEndForFirstFY2,
      );
      FinanceHelper.searchByName(fiscalYears.third.name);
      FiscalYears.selectFY(fiscalYears.third.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForThirdFY,
        periodEndForThirdFY,
      );

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice.invoiceNumber);
      Invoices.selectInvoice(testData.invoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$25.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$25.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
      Transactions.selectTransaction('Payment');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.second.code },
          { key: 'Amount', value: '$25.00' },
          { key: 'Source', value: testData.invoice.invoiceNumber },
          { key: 'Type', value: 'Payment' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
        ],
      });
      Transactions.closeTransactionsPage();
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
          name: fiscalYears.third.code,
          allocated: '$10.00',
        },
        previousBudgets: [
          {
            name: fiscalYears.second.code,
            allocated: '$10.00',
          },
          {
            name: testData.budget.name,
            allocated: '$10.00',
          },
        ],
      });
      FundDetails.openPreviousBudgetDetails(1);
      BudgetDetails.checkBudgetDetails({
        information: [{ key: 'Name', value: `${testData.budget.name}` }],
        summary: [{ key: 'Expended', value: '$0.00' }],
      });
      BudgetDetails.clickViewTransactionsLink();
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.first.code },
          { key: 'Amount', value: '$25.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$25.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      Transactions.closeTransactionsPage();
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
          name: fiscalYears.third.code,
          allocated: '$10.00',
        },
        previousBudgets: [
          {
            name: fiscalYears.second.code,
            allocated: '$10.00',
          },
          {
            name: testData.budget.name,
            allocated: '$10.00',
          },
        ],
      });
      FundDetails.openCurrentBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        information: [{ key: 'Name', value: `${testData.fund.code}-${fiscalYears.third.code}` }],
        summary: [{ key: 'Expended', value: '$0.00' }],
      });
      BudgetDetails.clickViewTransactionsLink();
      ['Allocation', 'Encumbrance'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: true,
        });
      });
      ['Pending payment', 'Expended'].forEach((transactionType) => {
        Transactions.checkTransactionsList({
          records: [{ type: transactionType }],
          present: false,
        });
      });
      Transactions.selectTransaction('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: fiscalYears.third.code },
          { key: 'Amount', value: '$25.00' },
          { key: 'Source', value: `${testData.orderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Expense class', value: testData.expenseClass.name },
          { key: 'Initial encumbrance', value: '$25.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
