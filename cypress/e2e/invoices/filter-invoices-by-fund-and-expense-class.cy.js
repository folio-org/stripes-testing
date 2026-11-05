import {
  APPLICATION_NAMES,
  INVOICE_FILTERS_LABELS,
  ORDER_LINE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const INVOICE_FILTERS = [
    INVOICE_FILTERS_LABELS.INVOICE_STATUS,
    INVOICE_FILTERS_LABELS.VENDOR_NAME,
    INVOICE_FILTERS_LABELS.INVOICE_DATE,
    INVOICE_FILTERS_LABELS.ACQUISITION_UNIT,
    INVOICE_FILTERS_LABELS.TAGS,
    INVOICE_FILTERS_LABELS.PAYMENT_DUE,
    INVOICE_FILTERS_LABELS.PAYMENT_METHOD,
    INVOICE_FILTERS_LABELS.APPROVAL_DATE,
    INVOICE_FILTERS_LABELS.SOURCE,
    INVOICE_FILTERS_LABELS.EXPORT_TO_ACCOUNTING,
    INVOICE_FILTERS_LABELS.PAYMENT_DATE,
    INVOICE_FILTERS_LABELS.BATCH_GROUP,
    INVOICE_FILTERS_LABELS.FUND_CODE,
    INVOICE_FILTERS_LABELS.EXPENSE_CLASS,
    INVOICE_FILTERS_LABELS.LOCK_TOTAL,
    INVOICE_FILTERS_LABELS.FISCAL_YEAR,
    INVOICE_FILTERS_LABELS.CREATED_BY,
    INVOICE_FILTERS_LABELS.DATE_CREATED,
    INVOICE_FILTERS_LABELS.UPDATED_BY,
    INVOICE_FILTERS_LABELS.DATE_UPDATED,
    INVOICE_FILTERS_LABELS.CREATED_BY_INVOICE_LINE,
    INVOICE_FILTERS_LABELS.DATE_CREATED_INVOICE_LINE,
    INVOICE_FILTERS_LABELS.UPDATED_BY_INVOICE_LINE,
    INVOICE_FILTERS_LABELS.DATE_UPDATED_INVOICE_LINE,
  ];
  const ORDER_LINE_FILTERS = [
    ORDER_LINE_FILTER_LABELS.RECEIPT_STATUS,
    ORDER_LINE_FILTER_LABELS.PAYMENT_STATUS,
    ORDER_LINE_FILTER_LABELS.PREFIX,
    ORDER_LINE_FILTER_LABELS.SUFFIX,
    ORDER_LINE_FILTER_LABELS.ACQUISITION_UNIT,
    ORDER_LINE_FILTER_LABELS.ACQUISITION_METHOD,
    ORDER_LINE_FILTER_LABELS.LOCATION,
    ORDER_LINE_FILTER_LABELS.FUND_CODE,
    ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS,
    ORDER_LINE_FILTER_LABELS.LINKED_PACKAGE_POL,
    ORDER_LINE_FILTER_LABELS.ORDER_FORMAT,
    ORDER_LINE_FILTER_LABELS.MATERIAL_TYPE_ELECTRONIC,
    ORDER_LINE_FILTER_LABELS.MATERIAL_TYPE_PHYSICAL,
    ORDER_LINE_FILTER_LABELS.DONOR,
    ORDER_LINE_FILTER_LABELS.VENDOR,
    ORDER_LINE_FILTER_LABELS.TAGS,
    ORDER_LINE_FILTER_LABELS.SOURCE,
    ORDER_LINE_FILTER_LABELS.COLLECTION,
    ORDER_LINE_FILTER_LABELS.RUSH,
    ORDER_LINE_FILTER_LABELS.ACCESS_PROVIDER,
    ORDER_LINE_FILTER_LABELS.ACTIVATED,
    ORDER_LINE_FILTER_LABELS.EXPECTED_ACTIVATION,
    ORDER_LINE_FILTER_LABELS.TRIAL,
    ORDER_LINE_FILTER_LABELS.SUBSCRIPTION_FROM,
    ORDER_LINE_FILTER_LABELS.SUBSCRIPTION_TO,
    ORDER_LINE_FILTER_LABELS.ACTUAL_RECEIPT_DATE,
    ORDER_LINE_FILTER_LABELS.EXPECTED_RECEIPT_DATE,
    ORDER_LINE_FILTER_LABELS.RECEIPT_DUE,
    ORDER_LINE_FILTER_LABELS.EXPORT_DATE,
    ORDER_LINE_FILTER_LABELS.CREATED_BY,
    ORDER_LINE_FILTER_LABELS.DATE_CREATED,
    ORDER_LINE_FILTER_LABELS.UPDATED_BY,
    ORDER_LINE_FILTER_LABELS.DATE_UPDATED,
  ];
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C353228_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C353228_Ledger_${getRandomPostfix()}`,
    };
    // Fund A with Expense class A and Fund B with Expense class B,
    // each with Invoice #N and PO Line #N distributed to this fund and expense class
    testData.fundGroups = ['A', 'B'].map((key) => {
      const expenseClass = {
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C353228_ExpenseClass_${key}_${getRandomPostfix()}`,
      };
      const fund = {
        ...Funds.getDefaultFund(),
        name: `AT_C353228_Fund_${key}_${getRandomPostfix()}`,
        ledgerId: testData.ledger.id,
      };

      const fundDistribution = {
        code: fund.code,
        fundId: fund.id,
        expenseClassId: expenseClass.id,
        distributionType: 'percentage',
        value: 100,
      };

      return {
        expenseClass,
        fund,
        fundDistribution,
        budget: {
          ...Budgets.getDefaultBudget(),
          fundId: fund.id,
          allocated: 100,
          statusExpenseClasses: [{ expenseClassId: expenseClass.id }],
        },
        orderLine: BasicOrderLine.getDefaultOrderLine({
          title: `AT_C353228_OrderLine_${key}_${getRandomPostfix()}`,
          fundDistribution: [fundDistribution],
        }),
      };
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });

      testData.fundGroups.forEach((fundGroup) => {
        ExpenseClasses.createExpenseClassViaApi(fundGroup.expenseClass);
        Funds.createViaApi(fundGroup.fund);
        Budgets.createViaApi({ ...fundGroup.budget, fiscalYearId: fiscalYear.id });
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          fundGroup.orderLine,
        ).then((order) => {
          fundGroup.order = order;
        });
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          fiscalYearId: fiscalYear.id,
          fundDistributions: [fundGroup.fundDistribution],
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          fundGroup.invoice = invoice;
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiOrdersOrdersView, CapabilitySets.uiInvoiceInvoiceView],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    testData.fundGroups.forEach((fundGroup) => {
      Invoices.deleteInvoiceViaApi(fundGroup.invoice.id);
      Orders.deleteOrderViaApi(fundGroup.order.id, false);
      // Expense class must be unassigned from the budget before the budget can be deleted
      Budgets.getBudgetByIdViaApi(fundGroup.budget.id).then((budget) => {
        Budgets.updateBudgetViaApi({ ...budget, statusExpenseClasses: [] });
      });
      Budgets.deleteViaApi(fundGroup.budget.id, false);
      Funds.deleteFundViaApi(fundGroup.fund.id, false);
      ExpenseClasses.deleteExpenseClassViaApi(fundGroup.expenseClass.id);
    });
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C353228 Allow user to filter invoices by Fund and Expense class (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353228'] },
    () => {
      const [fundGroupA, fundGroupB] = testData.fundGroups;

      // Step 1: Navigate to Invoices
      Invoices.assertFilterAccordions(INVOICE_FILTERS);

      // Step 2: Expand Fund code accordion filter and select Fund A
      Invoices.filterByMultiSelectOptions(INVOICE_FILTERS_LABELS.FUND_CODE, [fundGroupA.fund.code]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.FUND_CODE, [
        fundGroupA.fund.code,
      ]);
      Invoices.verifySearchResult(fundGroupA.invoice.vendorInvoiceNo);

      // Step 3: Expand Expense class accordion filter and select Class A
      Invoices.filterByMultiSelectOptions(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.FUND_CODE, [
        fundGroupA.fund.code,
      ]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      Invoices.verifySearchResult(fundGroupA.invoice.vendorInvoiceNo);

      // Step 4: Reset Fund code and Expense class filters by clicking "cross" sign next to field
      Invoices.clearFilter(INVOICE_FILTERS_LABELS.FUND_CODE);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.FUND_CODE, []);
      Invoices.clearFilter(INVOICE_FILTERS_LABELS.EXPENSE_CLASS);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, []);
      Invoices.verifyChooseFilterMessage();

      // Step 5: Expand Fund code accordion filter and select Fund B
      Invoices.filterByMultiSelectOptions(INVOICE_FILTERS_LABELS.FUND_CODE, [fundGroupB.fund.code]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.FUND_CODE, [
        fundGroupB.fund.code,
      ]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, []);
      Invoices.verifySearchResult(fundGroupB.invoice.vendorInvoiceNo);

      // Step 6: Expand Expense class accordion filter and select Class B
      Invoices.filterByMultiSelectOptions(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, [
        fundGroupB.expenseClass.name,
      ]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.FUND_CODE, [
        fundGroupB.fund.code,
      ]);
      Invoices.assertMultiSelectFilterValues(INVOICE_FILTERS_LABELS.EXPENSE_CLASS, [
        fundGroupB.expenseClass.name,
      ]);
      Invoices.verifySearchResult(fundGroupB.invoice.vendorInvoiceNo);

      // Step 7: Navigate to PO Lines (Apps > Orders > Order lines)
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrderLines();
      OrderLines.waitLoading();
      OrderLines.assertFilterAccordions(ORDER_LINE_FILTERS);

      // Step 8: Expand Fund code accordion filter and select Fund A
      OrderLines.filterByFundCodes([fundGroupA.fund.code]);
      OrderLines.assertFundCodeFilterValues([fundGroupA.fund.code]);
      OrderLines.assertTitlesInResults([fundGroupA.orderLine.titleOrPackage]);

      // Step 9: Expand Expense class accordion filter and select Class A
      OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      OrderLines.assertFundCodeFilterValues([fundGroupA.fund.code]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      OrderLines.assertTitlesInResults([fundGroupA.orderLine.titleOrPackage]);

      // Step 10: Reset Fund code filter by clicking "cross" sign
      OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.FUND_CODE);
      OrderLines.assertFundCodeFilterValues([]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      OrderLines.assertTitlesInResults([fundGroupA.orderLine.titleOrPackage]);

      // Step 11: Expand Fund code accordion filter and select Fund B
      OrderLines.filterByFundCodes([fundGroupB.fund.code]);
      OrderLines.assertFundCodeFilterValues([fundGroupB.fund.code]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
      ]);
      OrderLines.verifyNoResultsFoundMessage();

      // Step 12: Expand Expense class accordion filter and additionally select Class B
      OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupB.expenseClass.name,
      ]);
      OrderLines.assertFundCodeFilterValues([fundGroupB.fund.code]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        fundGroupA.expenseClass.name,
        fundGroupB.expenseClass.name,
      ]);
      OrderLines.assertTitlesInResults([fundGroupB.orderLine.titleOrPackage]);
    },
  );
});
