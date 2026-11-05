import {
  INVOICE_FILTERS_LABELS,
  INVOICE_STATUSES,
  ORGANIZATION_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import SelectOrganizationModal from '../../support/fragments/orders/modals/selectOrganizationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools } from '../../support/utils';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { FISCAL_YEAR, INVOICE_STATUS, TAGS } = INVOICE_FILTERS_LABELS;
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
    INVOICE_FILTERS_LABELS.TOTAL_AMOUNT,
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
  const SELECT_ORGANIZATION_COLLAPSED_FILTERS = [
    ORGANIZATION_FILTER_LABELS.TYPES,
    ORGANIZATION_FILTER_LABELS.TAGS,
    ORGANIZATION_FILTER_LABELS.IS_DONOR,
    ORGANIZATION_FILTER_LABELS.IS_VENDOR,
    ORGANIZATION_FILTER_LABELS.COUNTRY,
    ORGANIZATION_FILTER_LABELS.LANGUAGE,
    ORGANIZATION_FILTER_LABELS.PAYMENT_METHOD,
    ORGANIZATION_FILTER_LABELS.ACQUISITION_UNIT,
    ORGANIZATION_FILTER_LABELS.CREATED_BY,
    ORGANIZATION_FILTER_LABELS.DATE_CREATED,
    ORGANIZATION_FILTER_LABELS.UPDATED_BY,
    ORGANIZATION_FILTER_LABELS.DATE_UPDATED,
  ];
  const testData = {};

  before('Create test data', () => {
    // Own fiscal year series, so past/current/future FYs contain only invoices of this test
    const series = CodeTools(4);
    const currentYear = new Date().getFullYear();

    [testData.pastFiscalYear, testData.currentFiscalYear, testData.futureFiscalYear] = [
      -1, 0, 1,
    ].map((yearOffset) => ({
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${series}${currentYear + yearOffset}`,
      series,
      ...DateTools.getFullFiscalYearStartAndEnd(yearOffset),
    }));
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C388539_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C388539_Ledger_${getRandomPostfix()}`,
      fiscalYearOneId: testData.currentFiscalYear.id,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C388539_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      fiscalYearId: testData.currentFiscalYear.id,
      allocated: 100,
    };
    testData.tag = { label: `at_c388539_tag_${getRandomPostfix()}` };

    const createInvoiceWithTaggedLine = (fiscalYear) => Invoices.createInvoiceViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: fiscalYear.id,
      accountingCode: testData.organization.erpCode,
    }).then((invoice) => Invoices.createInvoiceLineViaApi({
      ...Invoices.getDefaultInvoiceLine({
        invoiceId: invoice.id,
        invoiceLineStatus: invoice.status,
      }),
      tags: { tagList: [testData.tag.label] },
    }).then(() => invoice));

    cy.clearLocalStorage();
    cy.getAdminToken();
    [testData.pastFiscalYear, testData.currentFiscalYear, testData.futureFiscalYear].forEach(
      (fiscalYear) => FiscalYears.createViaApi(fiscalYear),
    );
    Ledgers.createViaApi(testData.ledger);
    Funds.createViaApi(testData.fund);
    Budgets.createViaApi(testData.budget);
    cy.createTagApi(testData.tag).then((tagId) => {
      testData.tag.id = tagId;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // Past FY: one Open invoice, its invoice line has the tag
    createInvoiceWithTaggedLine(testData.pastFiscalYear).then((invoice) => {
      testData.pastInvoice = invoice;
    });
    // Current FY: Open invoice with the tagged invoice line and Approved invoice without tag
    createInvoiceWithTaggedLine(testData.currentFiscalYear).then((invoice) => {
      testData.currentOpenInvoice = invoice;
    });
    Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      fiscalYearId: testData.currentFiscalYear.id,
      fundDistributions: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      subTotal: 10,
      accountingCode: testData.organization.erpCode,
    }).then((invoice) => {
      testData.currentApprovedInvoice = invoice;

      Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.APPROVED });
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
    [testData.pastInvoice, testData.currentOpenInvoice, testData.currentApprovedInvoice].forEach(
      (invoice) => Invoices.deleteInvoiceViaApi(invoice.id),
    );
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    [testData.pastFiscalYear, testData.futureFiscalYear, testData.currentFiscalYear].forEach(
      (fiscalYear) => FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false),
    );
    cy.deleteTagApi(testData.tag.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C388539 Filter Invoices by "Fiscal year" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C388539'] },
    () => {
      const { pastFiscalYear, currentFiscalYear, futureFiscalYear } = testData;

      // Step 1: Check "Search & filter" left pane
      Invoices.waitForFiltersLoaded();
      Invoices.verifySearchFormInitialState();
      Invoices.assertFilterAccordions(INVOICE_FILTERS, { expanded: false });

      // Step 2: Check "Invoices" main pane
      Invoices.verifyResultsPaneEmptyState();

      // Step 3: Click "Fiscal year" accordion in the "Search & filter" left pane
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, '');

      // Step 4: Click dropdown list under "Fiscal year" accordion
      Invoices.assertSelectionFilterOptions(
        FISCAL_YEAR,
        [pastFiscalYear.code, currentFiscalYear.code, futureFiscalYear.code],
        { expandAccordion: false, placeholder: 'Filter options list' },
      );

      // Step 5: Start typing the name of past fiscal year in the search box
      Invoices.filterSelectionOptions(pastFiscalYear.code);

      // Step 6: Press "Enter"
      Invoices.selectHighlightedSelectionOption();
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, pastFiscalYear.code);
      Invoices.assertFilterClearButton(FISCAL_YEAR);
      Invoices.assertResetAllButtonState({ disabled: false });
      Invoices.assertInvoicesResultsListColumns();
      Invoices.assertInvoicesInResults([testData.pastInvoice.vendorInvoiceNo]);

      // Step 7: Expand "Tags" accordion and select tag assigned to invoice lines
      Invoices.filterByTags([testData.tag.label]);
      Invoices.assertInvoicesInResults([testData.pastInvoice.vendorInvoiceNo]);

      // Step 8: Clear "Tags" filter, select future fiscal year
      Invoices.clearFilter(TAGS);
      Invoices.selectFiscalYearFilter(futureFiscalYear.code);
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, futureFiscalYear.code);
      Invoices.assertFilterClearButton(FISCAL_YEAR);
      Invoices.assertResetAllButtonState({ disabled: false });
      Invoices.verifyNoResultsFound();

      // Step 9: Click "x" icon next to "Fiscal year"
      Invoices.clearFilter(FISCAL_YEAR);
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, '');
      Invoices.assertFilterClearButton(FISCAL_YEAR, false);
      Invoices.verifyResultsPaneEmptyState();

      // Step 10: Select current fiscal year
      Invoices.selectFiscalYearFilter(currentFiscalYear.code);
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, currentFiscalYear.code);
      Invoices.assertFilterClearButton(FISCAL_YEAR);
      Invoices.assertResetAllButtonState({ disabled: false });
      Invoices.assertInvoicesResultsListColumns();
      Invoices.assertInvoicesInResults([
        testData.currentOpenInvoice.vendorInvoiceNo,
        testData.currentApprovedInvoice.vendorInvoiceNo,
      ]);

      // Step 11: Expand "Tags" accordion and select tag assigned to invoice lines
      Invoices.filterByTags([testData.tag.label]);
      Invoices.assertInvoicesInResults([testData.currentOpenInvoice.vendorInvoiceNo]);

      // Step 12: Clear "Tags" filter, expand "Status" accordion
      Invoices.clearFilter(TAGS);
      Invoices.assertCheckboxFilterValues(INVOICE_STATUS, Object.values(INVOICE_STATUSES), {
        checked: false,
      });

      // Step 13: Check "Approved" status checkbox
      Invoices.selectStatusFilter(INVOICE_STATUSES.APPROVED);
      Invoices.assertCheckboxFilterValues(INVOICE_STATUS, [INVOICE_STATUSES.APPROVED]);
      Invoices.assertFilterClearButton(INVOICE_STATUS);
      Invoices.assertResetAllButtonState({ disabled: false });
      Invoices.assertInvoicesInResults([testData.currentApprovedInvoice.vendorInvoiceNo]);

      // Step 14: Click "Reset all" button
      Invoices.resetFilters();
      Invoices.assertSelectionFilterValue(FISCAL_YEAR, '');
      Invoices.assertFilterClearButton(FISCAL_YEAR, false);
      Invoices.assertFilterClearButton(INVOICE_STATUS, false);
      Invoices.verifyResultsPaneEmptyState();

      // Step 15: Click "Vendor name" accordion
      Invoices.verifyVendorNameFilter();

      // Step 16: Click "Organization look-up" link under "Vendor name" accordion
      Invoices.clickOrganizationLookUp();
      SelectOrganizationModal.verifyModalElements({
        expandedFilters: [ORGANIZATION_FILTER_LABELS.ORGANIZATIONS_STATUS],
        collapsedFilters: SELECT_ORGANIZATION_COLLAPSED_FILTERS,
      });
    },
  );
});
