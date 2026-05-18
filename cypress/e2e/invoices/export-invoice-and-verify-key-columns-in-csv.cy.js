import moment from 'moment';

import {
  DEFAULT_WAIT_TIME,
  EXPENSE_CLASS_STATUSES,
  EXPORT_INVOICE_FIELDS,
  EXPORT_INVOICE_LINE_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_SEARCH_INDEX_LABELS,
  INVOICE_SEARCH_INDEXES,
  INVOICE_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceView, Invoices, Vouchers } from '../../support/fragments/invoices';
import InvoicesExportCSV from '../../support/fragments/invoices/modal/exportResultsCSVModal';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../support/utils';
import FileManager from '../../support/utils/fileManager';
import { getRandomLetters } from '../../support/utils/stringTools';
import { buildExportReportRow } from '../../support/utils/invoicesExport';

const R = {
  ADMIN: 'admin',
  BATCH_GROUPS: 'batchGroups',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  BUDGET_C: 'budgetC',
  EXPENSE_CLASS_A: 'expenseClassA',
  EXPENSE_CLASS_B: 'expenseClassB',
  FISCAL_YEAR_1: 'fiscalYear1',
  FISCAL_YEAR_2: 'fiscalYear2',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  FUND_C: 'fundC',
  INVOICE_1: 'invoice1',
  INVOICE_2: 'invoice2',
  INVOICE_LINES_MAP: 'invoiceLinesMap',
  LEDGER_A: 'ledgerA',
  LEDGER_B: 'ledgerB',
  LOCALE: 'locale',
  ORGANIZATION: 'organization',
  USER: 'user',
  VOUCHERS_MAP: 'vouchersMap',
  VOUCHER_LINES_MAP: 'voucherLinesMap',
};

const CSV_MASK = 'invoice-export-*.csv';

const createMapFromList = (list) => new Map(list.map((item) => [item.id, item]));

const getOrCreateMap = (flow, key) => flow.get(key) || new Map();

const setMapEntry = (flow, key, id, value, cleanup) => {
  const currentMap = getOrCreateMap(flow, key);
  flow.set(key, currentMap.set(id, value), cleanup);
};

const filterInvoiceLinesByInvoiceId = (invoiceLines, invoiceId) => {
  return invoiceLines
    .filter(({ invoiceId: lineInvoiceId }) => lineInvoiceId === invoiceId)
    .sort((a, b) => a.invoiceLineNumber.localeCompare(b.invoiceLineNumber));
};

describe('Invoices', () => {
  const flow = new ExecutionFlowManager();

  before('Create C1332520 preconditions', () => {
    cy.getAdminToken();
    cy.getAdminUserDetails().then((admin) => flow.set(R.ADMIN, admin));
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganization)
      .step(steps.createExpenseClasses)
      .step(steps.createFiscalYears)
      .step(steps.createLedgers)
      .step(steps.createFundsAndBudgets)
      .step(steps.fetchBatchGroup)
      .step(steps.createInvoices)
      .step(steps.fetchVouchers)
      .step(steps.createAndLoginUser);
  });

  after('Delete C1332520 data', () => {
    cy.getAdminToken();
    FileManager.deleteFilesFromDownloadsByMask(CSV_MASK);
    flow.cleanup();
  });

  it(
    'C1332520 Export invoice and verify the presence of key columns in the .csv file (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1332520'] },
    () => {
      const {
        admin,
        batchGroups,
        expenseClassA,
        expenseClassB,
        fiscalYear1,
        fiscalYear2,
        fundA,
        fundB,
        fundC,
        invoice1,
        invoice2,
        invoiceLinesMap,
        locale,
        organization,
        user,
        vouchersMap,
      } = flow.ctx();

      const invoicesMap = createMapFromList([invoice1, invoice2]);
      const expenseClassesMap = createMapFromList([expenseClassA, expenseClassB]);
      const fiscalYearsMap = createMapFromList([fiscalYear1, fiscalYear2]);
      const usersMap = createMapFromList([admin, { id: user.userId, ...user }]);
      const fundsMap = createMapFromList([fundA, fundB, fundC]);
      const batchGroupsMap = createMapFromList(batchGroups);
      const invoiceLines = Array.from(invoiceLinesMap.values()).sort((a, b) => invoicesMap
        .get(b.invoiceId)
        .folioInvoiceNo.localeCompare(invoicesMap.get(a.invoiceId).folioInvoiceNo));
      const invoice1Lines = filterInvoiceLinesByInvoiceId(invoiceLines, invoice1.id);
      const invoice2Lines = filterInvoiceLinesByInvoiceId(invoiceLines, invoice2.id);

      const buildExportReport = (lines) => lines.map((line) => {
        const invoice = invoicesMap.get(line.invoiceId);

        return buildExportReportRow({
          expenseClassesMap,
          fiscalYearsMap,
          fundsMap,
          invoice,
          invoiceLines: lines,
          line,
          locale,
          usersMap,
          vendor: organization,
          voucher: vouchersMap.get(invoice.id),
          batchGroupsMap,
        });
      });

      cy.log('< --- STEP 1 --- >');
      const folioPrefix = String(invoice1.folioInvoiceNo || '').slice(0, 2);
      Invoices.searchByParameter(INVOICE_SEARCH_INDEX_LABELS.FOLIO_INVOICE_NUMBER, folioPrefix);
      Invoices.checkSearchResultsContent({
        records: [
          {
            invoiceNumber: invoice1.vendorInvoiceNo,
            status: INVOICE_STATUSES.PAID,
            amount: invoice1.total,
          },
        ],
      });
      Invoices.assertInvoicesResultsListColumns();

      cy.log('< --- STEP 2 --- >');
      Invoices.selectInvoice(invoice1.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: invoice1.vendorInvoiceNo,
        subtitle: organization.code,
      });

      cy.log('< --- STEP 3 --- >');
      Invoices.resetFilters();
      Invoices.assertNoFiltersApplied();

      cy.log('< --- STEP 4 --- >');
      Invoices.searchByParameter(
        INVOICE_SEARCH_INDEX_LABELS.FOLIO_INVOICE_NUMBER,
        invoice2.folioInvoiceNo,
      );
      Invoices.assertSearchIndexValue(INVOICE_SEARCH_INDEX_LABELS.FOLIO_INVOICE_NUMBER);
      Invoices.waitResultsListLoading();
      Invoices.verifySearchResult(invoice2.vendorInvoiceNo);

      cy.log('< --- STEP 5 --- >');
      Invoices.clickExportResultsCSV();
      InvoicesExportCSV.waitLoading();

      cy.log('< --- STEP 6 --- >');
      InvoicesExportCSV.exportResults();
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('< --- STEP 7 --- >');
      InvoicesExportCSV.assertExportedCSVFile({
        fileMask: CSV_MASK,
        content: buildExportReport(invoice2Lines),
      });

      const INVOICE_FIELDS_TO_EXPORT = [
        EXPORT_INVOICE_FIELDS.VENDOR_INVOICE_NO,
        EXPORT_INVOICE_FIELDS.FOLIO_INVOICE_NO,
        EXPORT_INVOICE_FIELDS.VENDOR_NAME,
        EXPORT_INVOICE_FIELDS.FISCAL_YEAR,
      ];

      const INVOICE_LINE_FIELDS_TO_EXPORT = [
        EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_NUMBER,
        EXPORT_INVOICE_LINE_FIELDS.INVOICE_LINE_DATE_CREATED,
      ];

      cy.log('< --- STEP 8 --- >');
      Invoices.clickExportResultsCSV();
      InvoicesExportCSV.waitLoading();
      InvoicesExportCSV.selectInvoiceFields(INVOICE_FIELDS_TO_EXPORT);

      cy.log('< --- STEP 9 --- >');
      InvoicesExportCSV.selectInvoiceLineFields(INVOICE_LINE_FIELDS_TO_EXPORT);
      InvoicesExportCSV.exportResults();
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('< --- STEP 10 --- >');
      InvoicesExportCSV.assertExportedCSVFile({
        fileMask: CSV_MASK,
        content: buildExportReport(invoice2Lines),
        expectedFields: [...INVOICE_FIELDS_TO_EXPORT, ...INVOICE_LINE_FIELDS_TO_EXPORT],
      });

      cy.log('< --- STEP 11 --- >');
      Invoices.resetFilters();
      Invoices.selectFiscalYearFilter(fiscalYear1.code);
      Invoices.verifySearchResult(invoice1.vendorInvoiceNo);
      Invoices.assertInvoicesResultsListColumns();

      cy.log('< --- STEP 12 --- >');
      Invoices.clickExportResultsCSV();
      InvoicesExportCSV.waitLoading();
      InvoicesExportCSV.exportResults();
      cy.wait(DEFAULT_WAIT_TIME);
      InvoicesExportCSV.assertExportedCSVFile({
        fileMask: CSV_MASK,
        content: buildExportReport(invoice1Lines),
      });
    },
  );
});

function getPreconditionSteps() {
  const createInvoiceLine = ({
    invoice,
    accountingCode,
    fundDistributions,
    subTotal,
    description,
    flow,
  }) => {
    return Invoices.createInvoiceLineViaApi(
      Invoices.getDefaultInvoiceLine({
        invoiceId: invoice.id,
        invoiceLineStatus: invoice.status,
        fundDistributions,
        accountingCode,
        subTotal,
        description,
        releaseEncumbrance: true,
      }),
    ).then((createdLine) => setMapEntry(flow, R.INVOICE_LINES_MAP, createdLine.id, createdLine));
  };

  const createRepeatedInvoiceLines = ({
    invoice,
    accountingCode,
    count,
    fundDistributions,
    descriptionPrefix,
    flow,
  }) => {
    Array.from({ length: count }).forEach((_, index) => {
      createInvoiceLine({
        invoice,
        accountingCode,
        fundDistributions,
        subTotal: 10,
        description: `${descriptionPrefix}_${index + 1}`,
        flow,
      });
    });
  };

  const fetchInvoiceByVendorNumber = (vendorInvoiceNo) => {
    return Invoices.getInvoiceViaApi({
      query: `${INVOICE_SEARCH_INDEXES.VENDOR_INVOICE_NUMBER}=="${vendorInvoiceNo}"`,
    }).then(({ invoices }) => invoices[0]);
  };

  const createOrganization = (flow) => {
    const baseOrganization = NewOrganization.getDefaultOrganization({ accounts: 1 });
    const organization = {
      ...baseOrganization,
      erpCode: `ERP-${getRandomLetters(5)}`,
      accounts: baseOrganization.accounts.map(({ accountNo, ...rest }) => ({
        accountNo: `${accountNo}-${getRandomLetters(5)}`,
        ...rest,
      })),
    };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
  };

  const createExpenseClasses = (flow) => {
    const cleanup = (id) => ExpenseClasses.deleteExpenseClassViaApi(id, { failOnStatusCode: false });

    [R.EXPENSE_CLASS_A, R.EXPENSE_CLASS_B].forEach((expenseClassKey) => {
      ExpenseClasses.createExpenseClassViaApi({
        ...ExpenseClasses.getDefaultExpenseClass(),
        externalAccountNumberExt: expenseClassKey,
      }).then((createdExpenseClass) => flow.set(expenseClassKey, createdExpenseClass, cleanup.bind(null, createdExpenseClass.id)));
    });
  };

  const createFiscalYears = (flow) => {
    const cleanup = (id) => FiscalYears.deleteFiscalYearViaApi(id, false);

    [R.FISCAL_YEAR_1, R.FISCAL_YEAR_2].forEach((fiscalYearKey) => {
      FiscalYears.createViaApi({
        ...FiscalYears.getDefaultFiscalYear(),
        currency: flow.get(R.LOCALE).currency,
        description: fiscalYearKey,
        series: getRandomLetters(5),
      }).then((createdFiscalYear) => flow.set(fiscalYearKey, createdFiscalYear, cleanup.bind(null, createdFiscalYear.id)));
    });
  };

  const createLedgers = (flow) => {
    const cleanup = (id) => Ledgers.deleteLedgerViaApi(id, false);

    [R.LEDGER_A, R.LEDGER_B].forEach((ledgerKey) => {
      Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: flow.get(R.FISCAL_YEAR_1).id,
      }).then((createdLedger) => flow.set(ledgerKey, createdLedger, cleanup.bind(null, createdLedger.id)));
    });
  };

  const createFundsAndBudgets = (flow) => {
    const expenseClassA = flow.get(R.EXPENSE_CLASS_A);
    const expenseClassB = flow.get(R.EXPENSE_CLASS_B);

    const buildBudget = (fundId, fiscalYearId, expenseClass) => ({
      ...Budgets.getDefaultBudget(),
      fundId,
      fiscalYearId,
      allocated: 1000,
      statusExpenseClasses: expenseClass
        ? [{ status: EXPENSE_CLASS_STATUSES.ACTIVE, expenseClassId: expenseClass.id }]
        : [],
    });

    Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: flow.get(R.LEDGER_A).id,
      externalAccountNo: R.LEDGER_A,
    })
      .then(({ fund: createdFundA }) => {
        flow.set(R.FUND_A, createdFundA, () => Funds.deleteFundViaApi(createdFundA.id, false));

        return Budgets.createViaApi(
          buildBudget(createdFundA.id, flow.get(R.FISCAL_YEAR_1).id, expenseClassA),
        );
      })
      .then((createdBudgetA) => flow.set(R.BUDGET_A, createdBudgetA, () => Budgets.deleteViaApi(createdBudgetA.id, false)));

    Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: flow.get(R.LEDGER_A).id,
    })
      .then(({ fund: createdFundB }) => {
        flow.set(R.FUND_B, createdFundB, () => Funds.deleteFundViaApi(createdFundB.id, false));

        return Budgets.createViaApi(
          buildBudget(createdFundB.id, flow.get(R.FISCAL_YEAR_1).id, expenseClassB),
        );
      })
      .then((createdBudgetB) => flow.set(R.BUDGET_B, createdBudgetB, () => Budgets.deleteViaApi(createdBudgetB.id, false)));

    Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: flow.get(R.LEDGER_B).id,
    })
      .then(({ fund: createdFundC }) => {
        flow.set(R.FUND_C, createdFundC, () => Funds.deleteFundViaApi(createdFundC.id, false));

        return Budgets.createViaApi(buildBudget(createdFundC.id, flow.get(R.FISCAL_YEAR_2).id));
      })
      .then((createdBudgetC) => flow.set(R.BUDGET_C, createdBudgetC, () => Budgets.deleteViaApi(createdBudgetC.id, false)));
  };

  const fetchBatchGroup = (flow) => {
    return BatchGroups.getBatchGroupsViaApi().then((batchGroups) => flow.set(R.BATCH_GROUPS, batchGroups));
  };

  const createInvoices = (flow) => {
    const cleanup = (entity) => {
      const shouldBeCancelledBeforeDelete = [
        INVOICE_STATUSES.PAID,
        INVOICE_STATUSES.APPROVED,
      ].includes(entity.status);

      if (shouldBeCancelledBeforeDelete) {
        Invoices.changeInvoiceStatusViaApi({ invoice: entity, status: INVOICE_STATUSES.CANCELLED });
      }

      flow.get(R.INVOICE_LINES_MAP)?.forEach((line) => {
        if (line.invoiceId === entity.id) {
          Invoices.deleteInvoiceLineViaApi(line.id, { failOnStatusCode: false });
        }
      });

      Invoices.deleteInvoiceViaApi(entity.id, { failOnStatusCode: false });
    };

    const organization = flow.get(R.ORGANIZATION);
    const fiscalYear1 = flow.get(R.FISCAL_YEAR_1);
    const fiscalYear2 = flow.get(R.FISCAL_YEAR_2);
    const fundA = flow.get(R.FUND_A);
    const fundB = flow.get(R.FUND_B);
    const fundC = flow.get(R.FUND_C);
    const expenseClassA = flow.get(R.EXPENSE_CLASS_A);
    const expenseClassB = flow.get(R.EXPENSE_CLASS_B);

    Invoices.createInvoiceViaApi({
      invoiceDate: moment().add(5, 'years').format(),
      vendorId: organization.id,
      fiscalYearId: fiscalYear1.id,
      batchGroupId: flow.get(R.BATCH_GROUPS)[0].id,
      accountingCode: organization.erpCode,
      exportToAccounting: false,
    })
      .then((invoice1) => {
        flow.set(R.INVOICE_1, invoice1);

        const fundADistribution = [
          {
            fundId: fundA.id,
            code: fundA.code,
            value: 100,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            expenseClassId: expenseClassA.id,
          },
        ];

        const fundBDistribution = [
          {
            fundId: fundB.id,
            code: fundB.code,
            value: 100,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            expenseClassId: expenseClassB.id,
          },
        ];

        const fundAAndBDistribution = [
          {
            fundId: fundA.id,
            code: fundA.code,
            value: 50,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            expenseClassId: expenseClassA.id,
          },
          {
            fundId: fundB.id,
            code: fundB.code,
            value: 50,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            expenseClassId: expenseClassB.id,
          },
        ];

        createRepeatedInvoiceLines({
          invoice: invoice1,
          accountingCode: organization.erpCode,
          count: 3,
          fundDistributions: fundADistribution,
          descriptionPrefix: 'Fund A only line',
          flow,
        });

        createRepeatedInvoiceLines({
          invoice: invoice1,
          accountingCode: organization.erpCode,
          count: 3,
          fundDistributions: fundBDistribution,
          descriptionPrefix: 'Fund B only line',
          flow,
        });

        createRepeatedInvoiceLines({
          invoice: invoice1,
          accountingCode: organization.erpCode,
          count: 3,
          fundDistributions: fundAAndBDistribution,
          descriptionPrefix: 'Fund A and B line',
          flow,
        });

        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoice1,
          status: INVOICE_STATUSES.PAID,
        });
      })
      .then(() => fetchInvoiceByVendorNumber(flow.get(R.INVOICE_1).vendorInvoiceNo))
      .then((refreshedInvoice1) => flow.set(R.INVOICE_1, refreshedInvoice1, cleanup));

    Invoices.createInvoiceViaApi({
      vendorId: organization.id,
      fiscalYearId: fiscalYear2.id,
      batchGroupId: flow.get(R.BATCH_GROUPS)[0].id,
      accountingCode: organization.erpCode,
      exportToAccounting: false,
    })
      .then((invoice2) => {
        flow.set(R.INVOICE_2, invoice2);

        return createInvoiceLine({
          invoice: invoice2,
          accountingCode: organization.erpCode,
          fundDistributions: [
            {
              fundId: fundC.id,
              code: fundC.code,
              value: 100,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            },
          ],
          subTotal: 10,
          description: 'Fund C line',
          flow,
        });
      })
      .then(() => fetchInvoiceByVendorNumber(flow.get(R.INVOICE_2).vendorInvoiceNo))
      .then((refreshedInvoice2) => flow.set(R.INVOICE_2, refreshedInvoice2, cleanup));
  };

  const fetchVouchers = (flow) => {
    const deleteVoucherLine = (id) => Vouchers.deleteVoucherLineViaApi(id);
    const deleteVoucher = (id) => Vouchers.deleteVoucherViaApi(id);

    const handleVoucherLines = ({ voucherLines }) => {
      voucherLines.forEach((line) => {
        setMapEntry(
          flow,
          R.VOUCHER_LINES_MAP,
          line.id,
          line,
          deleteVoucherLine.bind(null, line.id),
        );
      });
    };

    const handleVouchers = (vouchers, invoice) => {
      vouchers.forEach((voucher) => {
        setMapEntry(
          flow,
          R.VOUCHERS_MAP,
          invoice.id,
          voucher,
          deleteVoucher.bind(null, voucher.id),
        );

        return Vouchers.getVoucherLinesViaApi({ query: `voucherId=="${voucher.id}"` }).then(
          handleVoucherLines,
        );
      });
    };

    [flow.get(R.INVOICE_1), flow.get(R.INVOICE_2)].forEach((invoice) => {
      Vouchers.getVouchersViaApi({ query: `invoiceId=="${invoice.id}"` }).then(({ vouchers }) => handleVouchers(vouchers, invoice));
    });
  };

  const createAndLoginUser = (flow) => {
    return cy
      .createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        Permissions.uiInvoicesExportSearchResults.gui,
      ])
      .then((user) => {
        flow.set(R.USER, user, (entity) => Users.deleteViaApi(entity.userId));

        return cy.login(user.username, user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  return {
    createOrganization,
    createExpenseClasses,
    createFiscalYears,
    createLedgers,
    createFundsAndBudgets,
    createInvoices,
    createAndLoginUser,
    fetchBatchGroup,
    fetchVouchers,
  };
}
