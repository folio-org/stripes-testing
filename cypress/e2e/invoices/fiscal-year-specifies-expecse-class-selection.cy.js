import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { FiscalYears, Budgets, LedgerRollovers } from '../../support/fragments/finance';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import { DateTools, StringTools, CodeTools } from '../../support/utils';
import { INVOICE_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const date = new Date();
  const code = CodeTools(4);
  const fiscalYears = {
    prev: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomFourDigitNumber()}`,
      periodStart: new Date(),
      periodEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2),
    },
    next: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomFourDigitNumber()}`,
      periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3),
      periodEnd: new Date(date.getFullYear() + 1, 11, 31),
    },
  };
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.defaultOngoingTimeOrder, vendor: organization.id, reEncumber: true },
    expenseClasses: [
      ExpenseClasses.getDefaultExpenseClass(),
      ExpenseClasses.getDefaultExpenseClass(),
    ],
    rollover: {},
    invoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      // NOTE: Preconditions items should be created in the following sequence for the test case purpose
      Organizations.createOrganizationViaApi(testData.organization)
        .then(() => {
          FiscalYears.createViaApi(fiscalYears.next);

          const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
            fiscalYear: fiscalYears.prev,
            ledger: { restrictEncumbrance: true, restrictExpenditures: true },
            budget: { allocated: 100 },
          });

          testData.ledger = ledger;
          testData.fund = fund;
          testData.budget = budget;

          ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses[0]).then(
            ({ id: expenseClassId }) => {
              Budgets.getBudgetViaApi({ query: `fiscalYearId=${fiscalYears.prev.id}` }).then(
                ({ budgets }) => {
                  Budgets.updateBudgetViaApi({
                    ...budgets[0],
                    statusExpenseClasses: [
                      {
                        status: 'Active',
                        expenseClassId,
                      },
                    ],
                  });
                },
              );
            },
          );
        })
        .then(() => {
          testData.rollover = LedgerRollovers.generateLedgerRollover({
            ledger: testData.ledger,
            fromFiscalYear: fiscalYears.prev,
            toFiscalYear: fiscalYears.next,
            encumbrancesRollover: [],
            needCloseBudgets: false,
          });
          LedgerRollovers.createLedgerRolloverViaApi(testData.rollover);

          FiscalYears.updateFiscalYearViaApi({
            ...fiscalYears.prev,
            _version: 1,
            periodStart: new Date(date.getFullYear() - 1, 0, 1),
            periodEnd: new Date(date.getFullYear() - 1, 11, 31),
          });

          FiscalYears.updateFiscalYearViaApi({
            ...fiscalYears.next,
            _version: 1,
            periodStart: new Date(date.getFullYear(), date.getMonth(), date.getDay() - 1),
            periodEnd: new Date(date.getFullYear() + 1, 11, 31),
          });

          ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses[1]).then(() => {
            Budgets.getBudgetViaApi({ query: `fiscalYearId=${fiscalYears.next.id}` }).then(
              ({ budgets }) => {
                Budgets.updateBudgetViaApi({
                  ...budgets[0],
                  statusExpenseClasses: testData.expenseClasses.map(({ id }) => ({
                    status: 'Active',
                    expenseClassId: id,
                  })),
                });
              },
            );
          });

          cy.getBatchGroups().then(({ id: batchGroupId, name: batchGroupName }) => {
            testData.invoice = Invoices.getDefaultInvoice({
              batchGroupId,
              batchGroupName,
              vendorId: testData.organization.id,
              vendorName: testData.organization.name,
              accountingCode: testData.organization.erpCode,
              invoiceDate: DateTools.getCurrentDate(),
            });
          });
        });
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });

    [fiscalYears.prev, fiscalYears.next].forEach(({ id: fiscalYearId }) => {
      Budgets.getBudgetViaApi({ query: `fiscalYearId=${fiscalYearId}` }).then(({ budgets }) => {
        Budgets.updateBudgetViaApi({ ...budgets[0], statusExpenseClasses: [] });
        Budgets.deleteViaApi(budgets[0].id);
      });
    });
    testData.expenseClasses.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id));
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C396400 Select Expense class related to Fiscal year specified in invoice (thunderjet) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
    () => {
      // Click "Actions" button on the second "Invoices" pane -> select "New" option
      const InvoiceEditForm = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditForm.checkFiscalYearIsAbsent();
      InvoiceEditForm.checkButtonsConditions([
        {
          label: 'Fiscal year',
          conditions: { singleValue: '' },
        },
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Fill all mandatory fields with valid values
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        fiscalYear: fiscalYears.next.code,
        status: testData.invoice.status,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.invoice.vendorName,
        paymentMethod: testData.invoice.paymentMethod,
      });

      // Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });

      // Click "Actions" button in "Invoice lines" accordion, Select "New blank line" option
      const InvoiceLineEditForm = InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Fill in the following fields: "Description", "Quantity", "Sub-total"
      const description = 'invoice line description';
      InvoiceLineEditForm.fillInvoiceLineFields({
        description,
        quantity: '10',
        subTotal: '96',
      });
      // * "Save & close" button is enabled
      InvoiceLineEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Click "Add fund distribution" button, Select "Fund #1"
      InvoiceLineEditForm.addFundDistribution();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.checkFieldsConditions([
        { label: 'Expense class', conditions: { singleValue: '' } },
      ]);

      // Expand "Expense class*" dropdown
      InvoiceLineEditForm.expandDropDown('Expense class');
      InvoiceLineEditForm.checkDropDownOptionsListCount(2);

      // Select Expense class #2
      InvoiceLineEditForm.setDropDownValue(testData.expenseClasses[1].name);

      // Click "Save & close" button in "Create vendor invoice line" form
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkTableContent([{ poNumber: '', description }]);

      // Click "Actions" menu button, Select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Select the first fiscal year FYA2022 in "Fiscal year" dropdown
      InvoiceEditForm.fillInvoiceFields({
        fiscalYear: fiscalYears.prev.code,
      });

      // Click "Save & close" button
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Fiscal year', value: fiscalYears.prev.code }],
      });

      // Click invoice line record on invoice
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: testData.expenseClasses[1].name,
        },
      ]);

      // Click "Actions" menu button, Select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkFieldsConditions([
        { label: 'Expense class', conditions: { singleValue: '' } },
      ]);

      // Select "Fund #1" in "Fund ID" dropdown
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.checkFieldsConditions([
        { label: 'Expense class', conditions: { singleValue: testData.expenseClasses[0].name } },
      ]);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      // Expand "Expense class*" dropdown
      InvoiceLineEditForm.expandDropDown('Expense class');
      InvoiceLineEditForm.checkDropDownOptionsListCount(1);

      // Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
    },
  );
});
