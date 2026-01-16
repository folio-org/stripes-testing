import { Permissions } from '../../support/dictionary';
import { InvoiceLineDetails, Invoices, NewInvoice } from '../../support/fragments/invoices';
import invoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const accountConfigs = [
    { status: 'Active', name: 'Active_Account_1' },
    { status: 'Active', name: 'Active_Account_2' },
    { status: 'Inactive', name: 'Inactive_Account' },
    { status: 'Pending', name: 'Pending_Account' },
  ];

  const accounts = accountConfigs.map((cfg) => ({
    accountNo: getRandomPostfix(),
    accountStatus: cfg.status,
    name: `${cfg.name}_${getRandomPostfix()}`,
    paymentMethod: 'Cash',
  }));

  const organization = {
    ...NewOrganization.getDefaultOrganization(),
    accounts,
  };

  const testData = {
    organization,
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    invoice: {
      ...NewInvoice.defaultUiInvoice,
      accountingCode: organization.erpCode,
      vendorId: organization.id,
    },
    user: {},
  };
  const activeAccounts = [
    '',
    ...organization.accounts
      .filter((account) => account.accountStatus === 'Active')
      .map((account) => `${account.name} (${account.accountNo}) `),
  ];

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      BatchGroups.createBatchGroupViaApi(testData.batchGroup).then((batchGroup) => {
        testData.batchGroup.id = batchGroup.id;
        Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
          testData.organization.id = organizationId;
          Invoices.createInvoiceViaApi({
            vendorId: organizationId,
            batchGroupId: batchGroup.id,
          }).then((invoiceResponse) => {
            testData.invoice.id = invoiceResponse.id;
            testData.invoice.vendorInvoiceNo = invoiceResponse.vendorInvoiceNo;
          });
        });
      });
    });

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C413346 Only active account numbers are displayed in dropdown list when create invoice line (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C413346'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      Invoices.createInvoiceLineNewBlankLine();
      invoiceLineEditForm.checkSelectionOptions('Account number', activeAccounts);
      invoiceLineEditForm.selectSelectionOption(activeAccounts[1]);
      invoiceLineEditForm.fillInvoiceLineFields({
        description: getRandomPostfix(),
        quantity: '5',
        subTotal: '100',
      });
      invoiceLineEditForm.clickSaveButton();
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          {
            key: 'Account number',
            value: organization.accounts[0].accountNo,
          },
        ],
      });
    },
  );
});
