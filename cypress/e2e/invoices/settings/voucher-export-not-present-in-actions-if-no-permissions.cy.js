import { INVOICE_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { Budgets } from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import {
  BatchGroupConfigurations,
  BatchGroups,
} from '../../../support/fragments/settings/invoices';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const testData = {
      batchGroup: BatchGroups.getDefaultBatchGroup(),
      batchGroupConfig: BatchGroupConfigurations.getDefaultBatchGroupConfiguration(),
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      orderLine: {},
      invoice: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        BatchGroups.createBatchGroupViaApi(testData.batchGroup);
        BatchGroupConfigurations.createBatchGroupConfigurationViaApi({
          ...testData.batchGroupConfig,
          batchGroupId: testData.batchGroup.id,
          format: 'Application/json',
          uploadDirectory: 'sftp://ftp.ci.folio.org',
        });

        const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: { allocated: 100 },
        });

        testData.fiscalYear = fiscalYear;
        testData.fund = fund;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 98,
            fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` }).then(
                (orderLines) => {
                  testData.orderLine = orderLines[0];

                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: testData.organization.id,
                    fiscalYearId: testData.fiscalYear.id,
                    batchGroupId: testData.batchGroup.id,
                    poLineId: testData.orderLine.id,
                    fundDistributions: testData.orderLine.fundDistribution,
                    accountingCode: testData.organization.erpCode,
                  }).then((invoice) => {
                    testData.invoice = invoice;

                    Invoices.approveInvoiceViaApi({ invoice: testData.invoice });
                  });
                },
              );
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        Permissions.uiInvoicesDownloadBatchFileFromInvoiceRecord.gui,
        Permissions.invoiceSettingsBatchGroupViewEdit.gui,
      ]).then((userProperties) => {
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
      'C353222 Negative: Run batch export from full screen view with NO Voucher export permission (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353222'] },
      () => {
        // Search "Vendor invoice number" from precondition
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.checkSearchResultsContent([
          { invoiceNumber: testData.invoice.vendorInvoiceNo, status: INVOICE_STATUSES.APPROVED },
        ]);

        // Click "Actions" button on "Invoices" pane
        // Actions menu appears and does NOT contain any options
        Invoices.expandInvoiceResultsActions();
        Invoices.checkActionPresentInList({ actionName: 'Voucher export', present: false });
      },
    );
  });
});
