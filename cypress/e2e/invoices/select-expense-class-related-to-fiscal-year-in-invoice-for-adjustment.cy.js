import {
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const date = new Date();
    const code = CodeTools(4);
    const postfix = getRandomPostfix();
    // NOTE: Preconditions items should be created in the following sequence for the test case purpose
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C397319_Organization_${postfix}`,
    };
    testData.fiscalYears = {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C397319_FiscalYear_first_${postfix}`,
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: new Date(),
        periodEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `AT_C397319_FiscalYear_second_${postfix}`,
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    testData.expenseClasses = [
      {
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C397319_ExpenseClass_first_${postfix}`,
      },
      {
        ...ExpenseClasses.getDefaultExpenseClass(),
        name: `AT_C397319_ExpenseClass_second_${postfix}`,
      },
    ];
    testData.adjustmentDescription = `AT_C397319_Adjustment_${postfix}`;

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    FiscalYears.createViaApi(testData.fiscalYears.second);

    // Ledger #1 and Fund #1 with $100 budget related to the first fiscal year
    const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      fiscalYear: {
        ...testData.fiscalYears.first,
      },
      ledger: {
        name: `AT_C397319_Ledger_${postfix}`,
        restrictEncumbrance: true,
        restrictExpenditures: true,
      },
      fund: { name: `AT_C397319_Fund_${postfix}` },
      budget: { allocated: 100 },
    });
    testData.ledger = ledger;
    testData.fund = fund;
    testData.budget = budget;

    // Expense class #1 is added to the first fiscal year budget
    ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses[0]).then(
      ({ id: expenseClassId }) => {
        Budgets.getBudgetViaApi({
          query: `fiscalYearId=${testData.fiscalYears.first.id}`,
        }).then(({ budgets }) => {
          Budgets.updateBudgetViaApi({
            ...budgets[0],
            statusExpenseClasses: [{ status: 'Active', expenseClassId }],
          });
        });
      },
    );

    // Rollover from the first fiscal year to the second one
    cy.then(() => {
      LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          encumbrancesRollover: [],
          needCloseBudgets: false,
        }),
      );
    });

    // The second fiscal year period includes the current date
    cy.then(() => {
      FiscalYears.updateFiscalYearViaApi({
        ...testData.fiscalYears.first,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 1, 0, 1),
        periodEnd: new Date(date.getFullYear() - 1, 11, 31),
      });
      FiscalYears.updateFiscalYearViaApi({
        ...testData.fiscalYears.second,
        _version: 1,
        periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      });
    });

    // Both expense classes are added to the second fiscal year budget
    ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses[1]).then(() => {
      Budgets.getBudgetViaApi({
        query: `fiscalYearId=${testData.fiscalYears.second.id}`,
      }).then(({ budgets }) => {
        Budgets.updateBudgetViaApi({
          ...budgets[0],
          statusExpenseClasses: testData.expenseClasses.map(({ id }) => ({
            status: 'Active',
            expenseClassId: id,
          })),
        });
      });
    });

    cy.getBatchGroups().then(({ id: batchGroupId, name: batchGroupName }) => {
      testData.invoice = Invoices.getDefaultInvoice({
        batchGroupId,
        batchGroupName,
        vendorId: testData.organization.id,
        vendorName: testData.organization.name,
        invoiceDate: DateTools.getCurrentDate(),
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceCreate, CapabilitySets.uiInvoiceInvoicePayDifferentFy],
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
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });
    [testData.fiscalYears.first, testData.fiscalYears.second].forEach(({ id: fiscalYearId }) => {
      Budgets.getBudgetViaApi({ query: `fiscalYearId=${fiscalYearId}` }).then(({ budgets }) => {
        Budgets.updateBudgetViaApi({ ...budgets[0], statusExpenseClasses: [] });
        Budgets.deleteViaApi(budgets[0].id, false);
      });
    });
    testData.expenseClasses.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id));
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.first.id, false);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYears.second.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C397319 Select Expense class related to Fiscal year specified in invoice (for adjustment) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C397319'] },
    () => {
      // Step 1: Click "Actions" button, select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Fiscal year', conditions: { singleValue: '' } },
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Step 2: Fill in the fields, select the previous fiscal year
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        fiscalYear: testData.fiscalYears.first.code,
        status: INVOICE_STATUSES.OPEN,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Fiscal year', conditions: { singleValue: testData.fiscalYears.first.code } },
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Step 3: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
        ],
      });

      // Step 4: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Step 5: Add a not prorated adjustment
      InvoiceEditForm.fillInvoiceFields({
        adjustment: {
          description: testData.adjustmentDescription,
          value: '5',
          prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        },
      });
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Step 6: Click "Add fund distribution" button, select Fund #1
      InvoiceEditForm.fillInvoiceFields({
        addAdjustmentFundDistribution: true,
        adjustmentFund: testData.fund,
      });
      InvoiceEditForm.checkAdjustmentExpenseClass({ selected: testData.expenseClasses[0].name });

      // Step 7: Only the expense class of the previous fiscal year is in the dropdown
      InvoiceEditForm.checkAdjustmentExpenseClass({ options: [testData.expenseClasses[0].name] });

      // Step 8: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceFundDistributions: [
          {
            adjustment: testData.adjustmentDescription,
            fund: testData.fund.code,
            expenseClass: testData.expenseClasses[0].name,
          },
        ],
      });

      // Step 9: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Step 10: Select the current fiscal year
      InvoiceEditForm.fillInvoiceFields({ fiscalYear: testData.fiscalYears.second.code });
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Fiscal year', conditions: { singleValue: testData.fiscalYears.second.code } },
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Step 11: Select Fund #1 in "Fund ID" dropdown in the adjustment
      InvoiceEditForm.fillInvoiceFields({ adjustmentFund: testData.fund });
      InvoiceEditForm.checkAdjustmentExpenseClass({ selected: '' });

      // Step 12: Both expense classes of the current fiscal year are in the dropdown
      InvoiceEditForm.checkAdjustmentExpenseClass({
        options: testData.expenseClasses.map(({ name }) => name),
        error: 'Required!',
      });

      // Step 13: Select expense class #2
      InvoiceEditForm.fillInvoiceFields({
        adjustmentExpenseClass: testData.expenseClasses[1].name,
      });
      InvoiceEditForm.checkAdjustmentExpenseClass({ error: null });

      // Step 14: Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({ title: testData.invoice.vendorInvoiceNo });
    },
  );
});
