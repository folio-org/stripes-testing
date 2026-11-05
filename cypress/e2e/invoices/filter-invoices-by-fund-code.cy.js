import {
  INVOICE_FILTERS_LABELS,
  INVOICE_STATUSES,
  LIST_ASSERTION_MODES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const { FUND_CODE } = INVOICE_FILTERS_LABELS;
  const testData = {};

  before('Create test data', () => {
    testData.acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      name: `AT_C590839_AcqUnit_${getRandomPostfix()}`,
      protectRead: true,
    });
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C590839_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C590839_Ledger_${getRandomPostfix()}`,
    };
    // Fund C is protected by the acquisition unit the user is not assigned to
    [testData.fundA, testData.fundB, testData.fundC] = ['A', 'B', 'C'].map((key) => ({
      ...Funds.getDefaultFund(),
      name: `AT_C590839_Fund_${key}_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
      acqUnitIds: key === 'C' ? [testData.acquisitionUnit.id] : [],
    }));
    testData.budgets = [testData.fundA, testData.fundB, testData.fundC].map((fund) => ({
      ...Budgets.getDefaultBudget(),
      fundId: fund.id,
      allocated: 100,
    }));
    const getFundDistribution = (fund, value = 100) => ({
      code: fund.code,
      fundId: fund.id,
      distributionType: 'percentage',
      value,
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      const createInvoice = ({ fundDistributions, subTotal = 10 }) => Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        fiscalYearId: fiscalYear.id,
        fundDistributions,
        subTotal,
        accountingCode: testData.organization.erpCode,
      });

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      [testData.fundA, testData.fundB, testData.fundC].forEach((fund) => Funds.createViaApi(fund));
      testData.budgets.forEach((budget) => {
        Budgets.createViaApi({ ...budget, fiscalYearId: fiscalYear.id });
      });

      // Invoice #1: Open, two invoice lines with Fund A and Fund B
      createInvoice({ fundDistributions: [getFundDistribution(testData.fundA)] }).then(
        (invoice) => {
          testData.invoice1 = invoice;

          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              fundDistributions: [getFundDistribution(testData.fundB)],
              subTotal: 10,
            }),
          );
        },
      );
      // Invoice #2: Approved, one invoice line with Fund A
      createInvoice({ fundDistributions: [getFundDistribution(testData.fundA)] }).then(
        (invoice) => {
          testData.invoice2 = invoice;

          Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.APPROVED });
        },
      );
      // Invoice #3: Paid, one invoice line with Fund B
      createInvoice({ fundDistributions: [getFundDistribution(testData.fundB)] }).then(
        (invoice) => {
          testData.invoice3 = invoice;

          Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
        },
      );
      // Invoice #4: Reviewed, one invoice line with both Fund A and Fund B
      createInvoice({
        fundDistributions: [
          getFundDistribution(testData.fundA, 50),
          getFundDistribution(testData.fundB, 50),
        ],
      }).then((invoice) => {
        testData.invoice4 = invoice;

        Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.REVIEWED });
      });
      // Invoice #5: Open, one invoice line without funds
      createInvoice({ subTotal: 0 }).then((invoice) => {
        testData.invoice5 = invoice;
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
    // Approved and Paid invoices (#2, #3) cannot be deleted, so Fund A, Fund B,
    // their budgets and the ledger stay because of the related transactions
    [
      testData.invoice1,
      testData.invoice2,
      testData.invoice3,
      testData.invoice4,
      testData.invoice5,
    ].forEach((invoice) => Invoices.deleteInvoiceViaApi(invoice.id));
    testData.budgets.forEach((budget) => Budgets.deleteViaApi(budget.id, false));
    [testData.fundA, testData.fundB, testData.fundC].forEach((fund) => {
      Funds.deleteFundViaApi(fund.id, false);
    });
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C590839 Filter invoices by "Fund code" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C590839'] },
    () => {
      const [invoice1, invoice2, invoice3, invoice4, invoice5] = [
        testData.invoice1,
        testData.invoice2,
        testData.invoice3,
        testData.invoice4,
        testData.invoice5,
      ].map(({ vendorInvoiceNo }) => vendorInvoiceNo);

      // Step 1: Click "Reset all" button on "Search & filter" pane (if active)
      Invoices.waitForFiltersLoaded();
      Invoices.clearAllFilters();
      Invoices.verifyChooseFilterMessage();

      // Step 2: Expand "Fund code" accordion on "Search & filter" pane
      Invoices.assertMultiSelectFilterValues(FUND_CODE, []);

      // Step 3: Click the dropdown in "Fund code" accordion
      Invoices.assertMultiSelectFilterOptions(FUND_CODE, [
        testData.fundA.code,
        testData.fundB.code,
      ]);
      Invoices.assertMultiSelectFilterOptions(FUND_CODE, [testData.fundC.code], {
        expandAccordion: false,
        mode: LIST_ASSERTION_MODES.ABSENT,
      });

      // Step 4: Select "Fund A" from the list
      Invoices.filterByMultiSelectOptions(FUND_CODE, [testData.fundA.code]);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, [testData.fundA.code]);
      Invoices.assertInvoicesInResults([invoice1, invoice2, invoice4]);
      Invoices.verifyInvoicesAbsentInResults([invoice3, invoice5]);

      // Step 5: Clear "Fund code" field by clicking "X" button next to "Fund code" accordion
      Invoices.clearFilter(FUND_CODE);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, []);
      Invoices.verifyChooseFilterMessage();

      // Step 6: Click the dropdown in "Fund code" accordion, select "Fund B"
      Invoices.filterByMultiSelectOptions(FUND_CODE, [testData.fundB.code]);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, [testData.fundB.code]);
      Invoices.assertInvoicesInResults([invoice1, invoice3, invoice4]);
      Invoices.verifyInvoicesAbsentInResults([invoice2, invoice5]);

      // Step 7: Click the dropdown in "Fund code" accordion, select "Fund A"
      Invoices.filterByMultiSelectOptions(FUND_CODE, [testData.fundA.code]);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, [testData.fundA.code, testData.fundB.code]);
      Invoices.assertInvoicesInResults([invoice1, invoice2, invoice3, invoice4]);
      Invoices.verifyInvoicesAbsentInResults([invoice5]);

      // Step 8: Remove "Fund B" facet by clicking "X" next to it
      Invoices.removeMultiSelectChips(FUND_CODE, [testData.fundB.code]);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, [testData.fundA.code]);
      Invoices.assertMultiSelectFilterValues(FUND_CODE, [testData.fundB.code], {
        mode: LIST_ASSERTION_MODES.ABSENT,
      });
      Invoices.assertInvoicesInResults([invoice1, invoice2, invoice4]);
      Invoices.verifyInvoicesAbsentInResults([invoice3, invoice5]);
    },
  );
});
