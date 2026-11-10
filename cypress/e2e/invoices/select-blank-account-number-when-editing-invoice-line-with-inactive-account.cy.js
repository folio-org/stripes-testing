import {
  ACCOUNT_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.account = {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      name: `AT_C436933_Account_${postfix}`,
      paymentMethod: 'Cash',
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436933_Organization_${postfix}`,
      accounts: [testData.account],
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C436933_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C436933_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };

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
    Organizations.createOrganizationViaApi(testData.organization, { returnBody: true }).then(
      (organization) => {
        testData.organization = organization;
      },
    );

    // Invoice with one invoice line, account number is the vendor's active account
    cy.then(() => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;

        Invoices.createInvoiceLineViaApi({
          ...Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            fundDistributions: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
            subTotal: 10,
          }),
          accountNumber: testData.account.accountNo,
        });
      });
    });

    // Account status was changed to "Inactive" after invoice line creation
    cy.then(() => {
      Organizations.addDonorInfoViaApi(testData.organization.id, {
        ...testData.organization,
        accounts: [{ ...testData.account, accountStatus: ACCOUNT_STATUSES.INACTIVE }],
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit],
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
    'C436933 A user can select blank value in "Account number" field when editing invoice line (Organization-vendor has only one inactive account number) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C436933'] },
    () => {
      // Step 1: Click on invoice record
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 2: Click on invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: testData.account.accountNo },
        ],
      });

      // Step 3: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAccountNumberSelected(testData.account.accountNo);
      InvoiceLineEditForm.checkAccountNumberMarkedInactive();

      // Step 4: Choose blank option from "Account number" dropdown
      InvoiceLineEditForm.selectDropDownValue(INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, '', {
        exactMatch: true,
      });
      InvoiceLineEditForm.checkAccountNumberSelected('', { exactMatch: true });

      // Step 5: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({ title: testData.invoice.vendorInvoiceNo });

      // Step 6: Click on just edited invoice line record
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [{ key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: '-' }],
      });

      // Step 7: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAccountNumberSelected('', { exactMatch: true });
      InvoiceLineEditForm.checkSelectionOptions(INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, ['']);
    },
  );
});
