import {
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.account = {
      accountNo: getRandomPostfix(),
      accountStatus: 'Active',
      name: `AT_C436930_Account_${postfix}`,
      paymentMethod: 'Cash',
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436930_Organization_${postfix}`,
      accounts: [testData.account],
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C436930_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C436930_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.invoiceLineDescription = `AT_C436930_InvoiceLine_${postfix}`;

    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
      }).then((budget) => {
        testData.budget = budget;
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;

      Invoices.createInvoiceViaApi({
        vendorId: id,
        accountingCode: testData.organization.erpCode,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceCreate],
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
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C436930 A user can select blank value in "Account number" field when creating/editing invoice line (Organization-vendor has only one active account number) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C436930'] },
    () => {
      // Step 1: Click on invoice record
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 2: Click "Actions" button in "Invoice lines" accordion, select "New blank line"
      InvoiceView.openInvoiceLineEditForm();

      // Step 3: Expand "Account number" dropdown
      InvoiceLineEditForm.checkSelectionOptions(INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, [
        '',
        `${testData.account.name} (${testData.account.accountNo}) `,
      ]);

      // Step 4: Choose blank option from "Account number" dropdown
      InvoiceLineEditForm.selectSelectionOption('');
      InvoiceLineEditForm.checkAccountNumberSelected('', { exactMatch: true });

      // Step 5: Fill all mandatory fields, click "Save & close" button
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLineDescription,
        quantity: '1',
        subTotal: '10',
      });
      InvoiceLineEditForm.clickAddFundDistributionButton();
      InvoiceLineEditForm.selectFundDistribution(testData.fund.name);
      InvoiceLineEditForm.clickSaveButton();
      InteractorsTools.dismissCallout(InvoiceStates.invoiceLineCreatedMessage);
      InvoiceView.checkInvoiceLinesTableContent([{ description: testData.invoiceLineDescription }]);

      // Step 6: Click on just created invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: '-' }],
      });

      // Step 7: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAccountNumberSelected('', { exactMatch: true });

      // Step 8: Choose the existing account from "Account number" dropdown
      InvoiceLineEditForm.selectDropDownValue(
        INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER,
        testData.account.accountNo,
      );
      InvoiceLineEditForm.checkAccountNumberSelected(testData.account.accountNo);

      // Step 9: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InteractorsTools.dismissCallout(InvoiceStates.invoiceLineCreatedMessage);

      // Step 10: Click on just edited invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: testData.account.accountNo },
        ],
      });

      // Step 11: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAccountNumberSelected(testData.account.accountNo);

      // Step 12: Choose blank option from "Account number" dropdown
      InvoiceLineEditForm.selectDropDownValue(INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, '', {
        exactMatch: true,
      });
      InvoiceLineEditForm.checkAccountNumberSelected('', { exactMatch: true });

      // Step 13: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();

      // Step 14: Click on just edited invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: '-' }],
      });
    },
  );
});
