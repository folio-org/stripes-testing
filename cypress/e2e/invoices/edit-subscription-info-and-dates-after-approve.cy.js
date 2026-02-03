import moment from 'moment';

import { INVOICE_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Approvals, BatchGroups } from '../../support/fragments/settings/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const date = moment();
  const invoicesCount = 2;
  const testData = {
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    organization: NewOrganization.getDefaultOrganization(),
    orders: [],
    invoices: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fund = fund;
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      BatchGroups.createBatchGroupViaApi(testData.batchGroup);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        [...Array(invoicesCount).keys()].forEach((index) => {
          const order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
            testData.orders.push(response);

            Orders.updateOrderViaApi({ ...response, workflowStatus: 'Open' });
          });

          Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: testData.fiscalYear.id,
            accountingCode: testData.organization.erpCode,
            batchGroupId: testData.batchGroup.id,
            exportToAccounting: true,
          }).then((invoice) => {
            testData.invoices.push(invoice);

            OrderLines.getOrderLineViaApi({
              query: `poLineNumber=="*${testData.orders[index].poNumber}*"`,
            }).then((orderLines) => {
              const invoiceLine = Invoices.getDefaultInvoiceLine({
                invoiceId: invoice.id,
                invoiceLineStatus: invoice.status,
                poLineId: orderLines[0].id,
                fundDistributions: orderLines[0].fundDistribution,
                accountingCode: testData.organization.erpCode,
                subscriptionInfo: 'some info',
                subscriptionStart: date.utc().format('YYYY-MM-DD'),
                subscriptionEnd: date.utc().format('YYYY-MM-DD'),
              });
              Invoices.createInvoiceLineViaApi(invoiceLine);
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValue(false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C350952 Allow editing of subscription dates and subscription info after an invoice is approved/paid (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350952'] },
    () => {
      cy.getAdminToken();
      Approvals.setApprovePayValue(false);

      // Search invoice in the table
      Invoices.searchByNumber(testData.invoices[0].vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoices[0].vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        invoiceLines: [{ poNumber: testData.orders[0].poNumber }],
      });

      // Change the Invoice status from "Open" to "Approved":
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
      });

      // Start editing Invoice Line #1
      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();
      const InvoiceLineEditForm = InvoiceLineDetails.openInvoiceLineEditForm();

      // Update the following fields with valid values:
      // * "Subscription start date", "Subscription end date", "Subscription info"
      // Click "Save & close" button
      date.set('day', date.day() + 2);
      InvoiceLineEditForm.fillInvoiceLineFields({
        subscriptionInfo: 'some new info',
        subscriptionStartDate: date.utc().format('MM/DD/YYYY'),
        subscriptionEndDate: date.utc().format('MM/DD/YYYY'),
      });
      InvoiceLineEditForm.clickSaveButton();

      // Pay the Invoice #1:
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Start editing Invoice Line #1
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openInvoiceLineEditForm();

      // Update the following fields with valid values:
      // * "Subscription start date", "Subscription end date", "Subscription info"
      // Click "Save & close" button
      date.set('day', date.day() + 2);
      InvoiceLineEditForm.fillInvoiceLineFields({
        subscriptionInfo: 'some new info',
        subscriptionStartDate: date.utc().format('MM/DD/YYYY'),
        subscriptionEndDate: date.utc().format('MM/DD/YYYY'),
      });
      InvoiceLineEditForm.clickSaveButton();

      // Activate "Approve and pay in one click"
      cy.getAdminToken();
      Approvals.setApprovePayValue(true);

      // Go back to "Invoices" app and open "Invoice #2" details pane
      Invoices.searchByNumber(testData.invoices[1].vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoices[1].vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        invoiceLines: [{ poNumber: testData.orders[1].poNumber }],
      });

      // Approve and Pay Invoice #2 by one click
      InvoiceView.approveInvoice({ isApprovePayEnabled: true });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });

      // Start editing Invoice Line #2
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openInvoiceLineEditForm();

      // Update the following fields with valid values:
      // * "Subscription start date", "Subscription end date", "Subscription info"
      // Click "Save & close" button
      date.set('day', date.day() + 2);
      InvoiceLineEditForm.fillInvoiceLineFields({
        subscriptionInfo: 'some new info',
        subscriptionStartDate: date.utc().format('MM/DD/YYYY'),
        subscriptionEndDate: date.utc().format('MM/DD/YYYY'),
      });
      InvoiceLineEditForm.clickSaveButton();
    },
  );
});
