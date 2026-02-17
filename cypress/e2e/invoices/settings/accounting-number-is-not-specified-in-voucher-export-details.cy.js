import { INVOICE_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { Budgets } from '../../../support/fragments/finance';
import { InvoiceView, Invoices } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import {
  BatchGroupConfigurations,
  BatchGroups,
} from '../../../support/fragments/settings/invoices';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const orderLinesCount = 2;
    const testData = {
      batchGroup: BatchGroups.getDefaultBatchGroup(),
      batchGroupConfig: BatchGroupConfigurations.getDefaultBatchGroupConfiguration(),
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      orderLines: [],
      invoice: {},
      user: {},
      fileMask: '*00_00.xml',
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        BatchGroups.createBatchGroupViaApi(testData.batchGroup);
        BatchGroupConfigurations.createBatchGroupConfigurationViaApi({
          ...testData.batchGroupConfig,
          batchGroupId: testData.batchGroup.id,
        });
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
            ledger: { restrictEncumbrance: true, restrictExpenditures: true },
            budget: { allocated: 100 },
          });

          testData.fiscalYear = fiscalYear;
          testData.fund = fund;
          testData.budget = budget;

          testData.order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };

          OrderLinesLimit.setPOLLimitViaApi(orderLinesCount);
          Orders.createOrderViaApi(testData.order)
            .then((order) => {
              testData.order = order;

              cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
                const acquisitionMethod = body.acquisitionMethods[0].id;
                [...Array(orderLinesCount).keys()].forEach(() => {
                  const props = BasicOrderLine.getDefaultOrderLine({
                    acquisitionMethod,
                    purchaseOrderId: testData.order.id,
                    listUnitPrice: 10,
                    fundDistribution: [
                      { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                    ],
                  });
                  OrderLines.createOrderLineViaApi(props).then((orderLine) => {
                    testData.orderLines.push(orderLine);
                  });
                });
              });

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
            })
            .then(() => {
              Invoices.createInvoiceViaApi({
                vendorId: testData.organization.id,
                fiscalYearId: testData.fiscalYear.id,
                accountingCode: testData.organization.erpCode,
                batchGroupId: testData.batchGroup.id,
                exportToAccounting: true,
              }).then((invoice) => {
                testData.invoice = invoice;

                OrderLines.getOrderLineViaApi({
                  query: `poLineNumber=="*${testData.order.poNumber}*"`,
                }).then((orderLines) => {
                  orderLines.forEach((orderLine) => {
                    const invoiceLine = Invoices.getDefaultInvoiceLine({
                      invoiceId: testData.invoice.id,
                      invoiceLineStatus: testData.invoice.status,
                      poLineId: orderLine.id,
                      fundDistributions: orderLine.fundDistribution,
                      accountingCode: testData.organization.erpCode,
                    });
                    Invoices.createInvoiceLineViaApi(invoiceLine);
                  });
                });

                Invoices.approveInvoiceViaApi({ invoice: testData.invoice });
              });
            });
        });
      });

      cy.createTempUser([
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        Permissions.uiInvoicesDownloadBatchFileFromInvoiceRecord.gui,
        Permissions.uiInvoicesVoucherExport.gui,
        Permissions.invoiceSettingsBatchGroupViewEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(1);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
    });

    it(
      'C397985 Organization "Account number" is NOT specified in voucher export details when using default Accounting code (thunderjet) (TaaS)',
      { tags: ['criticalPathFlaky', 'thunderjet', 'C397985'] },
      () => {
        // Search invoice in the table
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);

        // Click "Actions" menu button in "Invoices" pane => click "Voucher export" option
        const VoucherExportForm = Invoices.openExportVoucherForm();
        VoucherExportForm.checkButtonsConditions([
          { label: 'Cancel', conditions: { disabled: false } },
          { label: 'Run manual export', conditions: { disabled: true } },
        ]);

        // Click "Batch group" dropdown, Select BatchGroup
        VoucherExportForm.selectBatchGroup({ batchGroup: testData.batchGroup.name });

        // Click "Run manual export" button, Click "Continue" button in "Run manual export" modal
        VoucherExportForm.clickRunManualExportButton();
        VoucherExportForm.getVoucherExportStatus().then((status) => {
          if (status === 'Generated') {
            VoucherExportForm.checkTableContent({
              records: [
                { status: 'Generated', message: 'Batch voucher was generated', download: true },
              ],
            });
            VoucherExportForm.checkButtonsConditions([
              { label: 'Run manual export', conditions: { disabled: false } },
            ]);
          }
        });

        // Check the row with recently generated voucher export record
        VoucherExportForm.selectBatchGroup({ batchGroup: testData.batchGroup.name, refresh: true });
        VoucherExportForm.checkTableContent({
          records: [
            {
              status: 'Uploaded',
              message: 'Uploaded successfully to FTP location',
              download: true,
            },
          ],
        });

        // Click "Download" icon at the end of the row
        VoucherExportForm.downloadVoucher();

        // Navigate to the local directory and open recently downloaded file
        FileManager.verifyFileIncludes(testData.fileMask, [
          `<batchGroup>${testData.batchGroup.name}</batchGroup>`,
          `<accountingCode>${testData.organization.erpCode}</accountingCode>`,
          `<vendorName>${testData.organization.name}</vendorName>`,
        ]);

        // Click "X" button in "Voucher export" view
        VoucherExportForm.closeVoucherExportForm();

        // Click the number of Invoice created in Preconditions
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
          voucherExport: [
            { key: 'Batch group', value: testData.batchGroup.name },
            { key: 'Batch file status', value: 'Uploaded' },
          ],
          voucherInformation: [
            { key: 'Status', value: 'Awaiting payment' },
            { key: 'Account number', value: '-' },
            { key: 'Accounting code', value: testData.organization.erpCode },
          ],
        });
      },
    );
  });
});
