import {
  ACCOUNT_STATUSES,
  COMMON_BUTTON_LABELS,
  INVOICE_LINE_EDIT_FIELDS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const accounts = [
    {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      name: `autotest_account_A_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
    {
      accountNo: getRandomPostfix(),
      accountStatus: ACCOUNT_STATUSES.ACTIVE,
      name: `autotest_account_B_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
    },
  ];
  const [inactiveAccount, activeAccount] = accounts;
  const activeAccountLabel = `${activeAccount.name} (${activeAccount.accountNo}) `;
  const inactiveAccountLabel = `${inactiveAccount.name} (${inactiveAccount.accountNo})  - ${ACCOUNT_STATUSES.INACTIVE}`;

  const testData = {
    organization: { ...NewOrganization.getDefaultOrganization(), accounts },
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    invoice: {},
    invoiceLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization, {
      returnBody: true,
    }).then((organization) => {
      testData.organization = organization;
    });
  };

  const createInvoiceWithLine = () => {
    return BatchGroups.createBatchGroupViaApi(testData.batchGroup).then((batchGroup) => {
      testData.batchGroup.id = batchGroup.id;

      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        batchGroupId: batchGroup.id,
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        const invoiceLine = {
          ...Invoices.getDefaultInvoiceLine({
            invoiceId: invoiceResponse.id,
            invoiceLineStatus: invoiceResponse.status,
            subTotal: 10,
          }),
          accountNumber: inactiveAccount.accountNo,
        };

        return Invoices.createInvoiceLineViaApi(invoiceLine).then(({ body }) => {
          testData.invoiceLine = body;
        });
      });
    });
  };

  const makeUsedAccountInactive = () => {
    const updatedOrganization = {
      ...testData.organization,
      accounts: testData.organization.accounts.map((account) => (account.accountNo === inactiveAccount.accountNo
        ? { ...account, accountStatus: ACCOUNT_STATUSES.INACTIVE }
        : account)),
    };

    return Organizations.addDonorInfoViaApi(testData.organization.id, updatedOrganization).then(
      () => {
        testData.organization = updatedOrganization;
      },
    );
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createInvoiceWithLine)
      .then(makeUsedAccountInactive)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C411660 Displaying already selected inactive account in dropdown list when edit invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C411660'] },
    () => {
      // Step 1: Open invoice
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
      });

      // Step 2: Select invoice line record
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();

      // Step 3: Edit invoice line and check the selected inactive account and warning
      Invoices.editInvoiceLine();
      InvoiceLineEditForm.waitLoading();
      InvoiceLineEditForm.checkAccountNumberMarkedInactive();
      InvoiceLineEditForm.checkAccountNumberWarning();
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 4: Select active account number and verify warning disappears
      InvoiceLineEditForm.checkSelectionOptions(INVOICE_LINE_EDIT_FIELDS.ACCOUNT_NUMBER, [
        '',
        inactiveAccountLabel,
        activeAccountLabel,
      ]);
      InvoiceLineEditForm.selectSelectionOption(activeAccountLabel);
      InvoiceLineEditForm.checkAccountNumberSelected(activeAccount.name);
      InvoiceLineEditForm.checkAccountNumberWarning(false);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 5: Save invoice line and verify the selected account
      InvoiceLineEditForm.clickSaveButton();
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.ACCOUNT_NUMBER, value: activeAccount.accountNo },
          { key: INVOICE_LINE_VIEW_FIELDS.ACCOUNTING_CODE, value: testData.organization.erpCode },
        ],
      });

      // Step 6-7: Edit invoice line again and verify the Account number dropdown
      Invoices.editInvoiceLine();
      InvoiceLineEditForm.waitLoading();
      InvoiceLineEditForm.checkAccountNumberWarning(false);
      InvoiceLineEditForm.checkAccountNumberSelected(activeAccount.name);
      InvoiceLineEditForm.checkSelectionOptions(INVOICE_LINE_EDIT_FIELDS.ACCOUNT_NUMBER, [
        '',
        activeAccountLabel,
      ]);
      InvoiceLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);
    },
  );
});
