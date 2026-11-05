import {
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  DATE_RANGE_FIELD_LABELS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_FILTERS_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { TAGS, TOTAL_AMOUNT, VENDOR_NAME } = INVOICE_FILTERS_LABELS;
  const TO_LESS_THAN_FROM_ERROR = '"To" can not be less than "From"';
  const testData = {};

  before('Create test data', () => {
    [testData.organizationA, testData.organizationB] = ['A', 'B'].map((key) => ({
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C388648_Organization_${key}_${getRandomPostfix()}`,
    }));
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C388648_Ledger_${getRandomPostfix()}`,
    };
    [testData.fundA, testData.fundB] = ['A', 'B'].map((key) => ({
      ...Funds.getDefaultFund(),
      name: `AT_C388648_Fund_${key}_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    }));
    testData.budgets = [testData.fundA, testData.fundB].map((fund) => ({
      ...Budgets.getDefaultBudget(),
      fundId: fund.id,
      allocated: 100,
    }));
    // The tag isolates the invoices of this test from the other invoices on the env
    testData.tag = { label: `at_c388648_tag_${getRandomPostfix()}` };
    testData.invoices = {};

    const getFundDistribution = (fund) => ({
      code: fund.code,
      fundId: fund.id,
      distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
      value: 100,
    });
    const createInvoice = (key, { organization, lines = [], ...invoiceProperties }) => {
      Invoices.createInvoiceViaApi({
        vendorId: organization.id,
        accountingCode: organization.erpCode,
        tags: [testData.tag.label],
        ...invoiceProperties,
      }).then((invoice) => {
        testData.invoices[key] = invoice;

        lines.forEach(({ subTotal, fund }) => {
          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              subTotal,
              fundDistributions: fund ? [getFundDistribution(fund)] : undefined,
            }),
          );
        });
      });
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.createTagApi(testData.tag).then((tagId) => {
      testData.tag.id = tagId;
    });
    [testData.organizationA, testData.organizationB].forEach((organization) => {
      Organizations.createOrganizationViaApi(organization);
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      [testData.fundA, testData.fundB].forEach((fund) => Funds.createViaApi(fund));
      testData.budgets.forEach((budget) => {
        Budgets.createViaApi({ ...budget, fiscalYearId: fiscalYear.id });
      });

      // Invoice A: total 0, default currency, Organization A, no invoice lines
      createInvoice('A', { organization: testData.organizationA });
      // Invoice B: total 1, not default currency (exchange rate set manually), Organization B
      createInvoice('B', {
        organization: testData.organizationB,
        currency: 'EUR',
        exchangeRate: 1.1,
        lines: [{ subTotal: 1, fund: testData.fundA }],
      });
      // Invoice C: total 3 = two invoice lines (1 + 1) + "In addition to" adjustment (1), Organization A
      createInvoice('C', {
        organization: testData.organizationA,
        adjustments: [
          {
            description: `AT_C388648_Adjustment_${getRandomPostfix()}`,
            value: 1,
            prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
            relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
            fundDistributions: [getFundDistribution(testData.fundA)],
          },
        ],
        lines: [
          { subTotal: 1, fund: testData.fundA },
          { subTotal: 1, fund: testData.fundA },
        ],
      });
      // Invoice D: total 4 = two invoice lines with Fund A and Fund B of the same ledger, Organization A
      createInvoice('D', {
        organization: testData.organizationA,
        lines: [
          { subTotal: 2, fund: testData.fundA },
          { subTotal: 2, fund: testData.fundB },
        ],
      });
      // Invoice E: total -2, one invoice line without fund distribution, Organization B
      createInvoice('E', {
        organization: testData.organizationB,
        lines: [{ subTotal: -2 }],
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceView],
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
    Object.values(testData.invoices).forEach((invoice) => Invoices.deleteInvoiceViaApi(invoice.id));
    testData.budgets.forEach((budget) => Budgets.deleteViaApi(budget.id, false));
    [testData.fundA, testData.fundB].forEach((fund) => Funds.deleteFundViaApi(fund.id, false));
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    cy.deleteTagApi(testData.tag.id);
    [testData.organizationA, testData.organizationB].forEach((organization) => {
      Organizations.deleteOrganizationViaApi(organization.id);
    });
  });

  it(
    'C388648 Filter Invoices by "Total amount" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C388648'] },
    () => {
      const [invoiceA, invoiceB, invoiceC, invoiceD, invoiceE] = ['A', 'B', 'C', 'D', 'E'].map(
        (key) => testData.invoices[key].vendorInvoiceNo,
      );

      // Step 1: Check "Search & filter" left pane
      Invoices.waitForFiltersLoaded();
      Invoices.verifySearchFormInitialState();
      Invoices.assertFilterAccordions(Object.values(INVOICE_FILTERS_LABELS), { expanded: false });

      // Step 2: Check "Invoices" main pane
      Invoices.verifyResultsPaneEmptyState();

      // Step 3: Click "Total amount" accordion (From/To fields are empty, Apply button is enabled)
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT);

      // Step 4: Type 0 in "From" field, 4 in "To" field, click "Apply" button
      Invoices.filterByTags([testData.tag.label]);
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { from: '0', to: '4' });
      Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      Invoices.assertFilterClearButton(TOTAL_AMOUNT);
      Invoices.assertResetAllButtonState({ disabled: false });
      Invoices.assertInvoicesResultsListColumns();
      Invoices.assertInvoicesInResults([invoiceA, invoiceB, invoiceC, invoiceD]);

      // Step 5: Click "x" icon next to "Total amount" accordion
      Invoices.clearFilter(TOTAL_AMOUNT);
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT);
      Invoices.assertFilterClearButton(TOTAL_AMOUNT, false);
      // The tag filter is cleared too, so the results pane is empty as in the test case
      Invoices.clearFilter(TAGS);
      Invoices.verifyResultsPaneEmptyState();

      // Step 6: Type 3 in "To" field, click "Apply" button
      Invoices.filterByTags([testData.tag.label]);
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { to: '3' });
      Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      Invoices.assertInvoicesInResults([invoiceA, invoiceB, invoiceC, invoiceE]);
      Invoices.verifyInvoicesAbsentInResults([invoiceD]);

      // Step 7: Select Organization A in "Vendor name" filter
      Invoices.selectVendorFilter(testData.organizationA);
      Invoices.assertInvoicesInResults([invoiceA, invoiceC]);

      // Step 8: Click "Reset all" button
      Invoices.resetFilters();
      Invoices.assertFilterClearButton(TOTAL_AMOUNT, false);
      Invoices.assertFilterClearButton(VENDOR_NAME, false);
      Invoices.verifyResultsPaneEmptyState();

      // TODO: uncomment steps 9-11 after UINV-588 (filtering invoices by negative total amounts) is done
      // // Step 9: Type -2 in "From" and "To" fields, click "Apply" button
      // Invoices.filterByTags([testData.tag.label]);
      // Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { from: '-2', to: '-2' });
      // Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      // Invoices.assertInvoicesInResults([invoiceE]);

      // // Step 10: Click "x" icon inside "From" field
      // Invoices.clearAmountRangeField(TOTAL_AMOUNT, DATE_RANGE_FIELD_LABELS.FROM);

      // // Step 11: Type -3 in "To" field, click "Apply" button
      // Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { to: '-3' });
      // Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      // Invoices.verifyNoResultsFound();

      // Step 12: Click "Reset all" (if active), type 4 in "From" field, click "Apply" button
      Invoices.clearAllFilters();
      Invoices.filterByTags([testData.tag.label]);
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { from: '4' });
      Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      Invoices.assertInvoicesInResults([invoiceD]);

      // Step 13: Type amount less than "From" value in "To" field, click "Apply" button
      Invoices.fillAmountRangeFilter(TOTAL_AMOUNT, { from: '4', to: '1' });
      Invoices.applyAmountRangeFilter(TOTAL_AMOUNT);
      Invoices.verifyAmountRangeFieldError(
        TOTAL_AMOUNT,
        DATE_RANGE_FIELD_LABELS.TO,
        TO_LESS_THAN_FROM_ERROR,
      );

      // Step 14: Click "x" icon inside "To" field
      Invoices.clearAmountRangeField(TOTAL_AMOUNT, DATE_RANGE_FIELD_LABELS.TO);
      Invoices.verifyAmountRangeFieldError(TOTAL_AMOUNT, DATE_RANGE_FIELD_LABELS.TO);
    },
  );
});
